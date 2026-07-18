import { describe, expect, test } from 'bun:test'
import {
  buildWritingCockpitModel,
  resolveEditorRevisionChapterId,
  selectTargetChapterForWriting,
} from './writingCockpitModel'

import {
  project,
  outlines,
  chapters,
  contextPackage,
  sceneCardChapter,
  acceptedProject,
  proseQualityReview,
  editorReportReview,
  editorRevisionReview,
  storylineSyncReview,
  qualityAuditSyncReview,
  qualityAuditRepairReceiptSyncReview,
  chapterHandoffSyncReview,
  chapterHandoffDeltaSyncReview,
  intentConfirmationSyncReview,
  benchmarkRecallSyncReview,
  storyUnitSyncReview,
  assetIntakeReview,
  ipSceneIntakeReview,
  readabilityReview,
  chapterAttractionReview,
  storyDriveSyncReview,
  characterArcSyncReview,
  coreDriftReview,
  readerPayoffSyncReview,
  readerRetentionSyncReview,
  chapterBenchmarkSyncReview,
  styleSampleSyncReview,
  readerExpectationSyncReview,
  runwaySyncReview,
  innovationSyncReview,
  signatureSceneSyncReview,
  volumeBeatSyncReview,
  first30RetentionReview,
  deliveryRiskConvergenceReview,
  governanceRecheckSyncReview,
} from './writingCockpitModel.test-fixtures'

describe('buildWritingCockpitModel planning', () => {
  test('planning desk treats dialogue voice and style recall scene cards as quality continuity mapping', () => {
    const backendContextPackage = {
      chapter_target: {
        goal: '把上一章对白声线和文风漂移风险拆到具体场景',
        conflict: '主角要在高压问讯中逼出证据来源',
        ending_hook: '证人一句短句反问暴露第三方',
        delivery_risk_carry_over: {
          label: '待修复 2',
          required_actions: [
            '对白声线：高压场景里搞笑担当声线让位，信息型配角不能当科普嘴。',
            '文风召回：按文风指纹恢复中长句呼吸，避免逗号结巴体。',
          ],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '问讯开场',
            purpose: '主角用短句压住证人',
            character_voice: '主角短句反问；证人长句辩解；搞笑担当在高压 beat 声线让位。',
            dialogue_goals: ['逼证人说漏证据来源，不能科普规则来历。'],
          },
          {
            scene_no: 2,
            title: '证词翻面',
            purpose: '用证词改变现场判断',
            style_directives: ['按文风指纹恢复中长句呼吸，避免逗号结巴体。'],
            benchmark_recall_directives: ['只学习对标章的节奏和潜台词，不复制原句。'],
          },
        ],
      },
      preflight: { ready: true, blockers: [] },
    }

    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], chapters[1]],
      activeChapter: chapters[1],
      contextPackage: backendContextPackage,
      diagnostics: { preflight: { ready: true, blockers: [] }, material_score: { score: 88, can_generate: true } },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.scenePlanStatus).toBe('ready')
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap).toHaveLength(2)
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap[0]).toMatchObject({
      sceneNo: 1,
      action: expect.stringContaining('主角短句反问'),
    })
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap[1]).toMatchObject({
      sceneNo: 2,
      action: expect.stringContaining('文风指纹'),
    })
    expect(model.chapterPlanningDesk.readiness).toBe('ready')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('confirm_plan_and_write_draft')
  })

  test('planning desk treats concept anchor scene cards as quality continuity mapping', () => {
    const backendContextPackage = {
      chapter_target: {
        goal: '让新设定第一次出现时跟动作后果绑定',
        conflict: '主角必须用蓝晶抢回证据记忆',
        ending_hook: '蓝晶烧出第二段陌生记忆',
        delivery_risk_carry_over: {
          label: '待修复 1',
          required_actions: [
            '新概念锚点：蓝晶首次出现必须靠动作反应、对话半句或物理后果解释当下作用。',
          ],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '蓝晶灼手',
            purpose: '蓝晶首次进入正文并改变证据判断',
            concept_anchor_rules: ['蓝晶首次出现时，先写灼手反应和记忆碎片炸开，再让角色半句对话确认用途。'],
            prose_craft_directives: ['不得用整段来历/等级解释蓝晶，只给当下作用锚点。'],
          },
        ],
      },
      preflight: { ready: true, blockers: [] },
    }

    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], chapters[1]],
      activeChapter: chapters[1],
      contextPackage: backendContextPackage,
      diagnostics: { preflight: { ready: true, blockers: [] }, material_score: { score: 88, can_generate: true } },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.scenePlanStatus).toBe('ready')
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap).toHaveLength(1)
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap[0]).toMatchObject({
      sceneNo: 1,
      action: expect.stringContaining('蓝晶首次出现'),
    })
    expect(model.chapterPlanningDesk.readiness).toBe('ready')
  })

  test('planning desk uses backend summary as context objective fallback', () => {
    const backendContextPackage = {
      chapter_target: {
        summary: '用警钟余波逼王府众人重新站队',
        conflict: '王府管事要压警讯，谢怀安要逼众人表态',
        ending_hook: '带血腰牌递到谢怀安掌心',
      },
      preflight: { ready: true, blockers: [] },
    }

    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: backendContextPackage,
      diagnostics: { preflight: { ready: true, blockers: [] }, material_score: { score: 88, can_generate: true } },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.contextPackageStatus).toBe('ready')
    expect(model.chapterPlanningDesk.episodePlan.chapterObjective).toBe('用警钟余波逼王府众人重新站队')
  })

  test('planning desk does not treat empty scene cards as ready', () => {
    const emptySceneCardChapter = {
      ...chapters[1],
      scene_list: [{}],
    }

    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], emptySceneCardChapter],
      activeChapter: emptySceneCardChapter,
      contextPackage,
      diagnostics: { preflight: { ready: true, blockers: [] }, material_score: { score: 88, can_generate: true } },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.scenePlanStatus).toBe('missing')
    expect(model.chapterPlanningDesk.sceneCards).toEqual([])
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('build_scene_plan')
  })

  test('planning desk blocks drafting when diagnostics report blockers', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage,
      diagnostics: {
        preflight: {
          ready: false,
          blockers: ['缺少上一章承接'],
        },
        material_score: { score: 88, can_generate: true },
      },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('blocked')
    expect(model.chapterPlanningDesk.reasons).toContain('生成诊断阻塞：缺少上一章承接')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_generation_diagnostics')
    expect(model.chapterPlanningDesk.shouldAutoExpandPlanner).toBe(true)
  })

  test('planning desk is ready when context and scene cards are usable', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage,
      diagnostics: {
        preflight: { ready: true, blockers: [] },
        material_score: { score: 88, can_generate: true },
      },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('ready')
    expect(model.chapterPlanningDesk.statusLabel).toBe('本章可写')
    expect(model.chapterPlanningDesk.shouldAutoExpandPlanner).toBe(false)
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('confirm_plan_and_write_draft')
    expect(model.chapterPlanningDesk.episodePlan.chapterObjective).toBe('用警钟把边军危机压到王府筵席上')
    expect(model.chapterPlanningDesk.sceneCards).toHaveLength(1)
    expect(model.chapterPlanningDesk.sceneCards[0].sceneNo).toBe(1)
    expect(model.chapterPlanningDesk.sceneCards[0].endingHook).toBe('第三声钟响后，守将闯入')
  })

  test('planning desk routes ready prose chapter to review instead of draft generation', () => {
    const proseSceneChapter = {
      ...sceneCardChapter,
      chapter_text: '谢怀安听完第三声警钟，抬手让满堂噤声。'.repeat(30),
    }

    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [proseSceneChapter],
      activeChapter: proseSceneChapter,
      contextPackage,
      diagnostics: {
        preflight: { ready: true, blockers: [] },
        material_score: { score: 88, can_generate: true },
      },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('ready')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('review_draft')
  })

  test('acceptance desk stays hidden for a chapter without prose', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[1],
      materialScore: { score: 82, can_generate: true },
      reviews: [],
    })

    expect(model.chapterAcceptanceDesk.visible).toBe(false)
    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('hidden')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('refresh_context_package')
  })

  test('prose chapter without a quality review needs quality check', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [],
    })

    expect(model.chapterAcceptanceDesk.visible).toBe(true)
    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_quality_check')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('refresh_current_quality')
    expect(model.primaryActionKey).toBe('refresh_current_quality')
    expect(model.topStatus.primaryActionKey).toBe('refresh_current_quality')
  })

  test('malformed quality self-check cannot make synced prose ready to accept', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              error: '模型自检失败',
              revised: false,
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_quality_check')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('refresh_current_quality')
    expect(model.primaryActionKey).toBe('refresh_current_quality')
    expect(model.topStatus.primaryActionKey).toBe('refresh_current_quality')
  })

  test('quality self-check with only empty issue arrays still needs quality check', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              final_text: chapters[0].chapter_text,
              review: {
                issues: [],
                must_fix: [],
                optional_improvements: [],
                revision_directives: [],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_quality_check')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('refresh_current_quality')
    expect(model.primaryActionKey).toBe('refresh_current_quality')
    expect(model.topStatus.primaryActionKey).toBe('refresh_current_quality')
  })

  test('passing quality score without current prose freshness marker still needs quality check', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              final_text: undefined,
              review: {
                score: 82,
                passed: true,
                status: 'pass',
                issues: [],
                must_fix: [],
                optional_improvements: [],
                revision_directives: [],
                needs_revision: false,
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_quality_check')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('refresh_current_quality')
    expect(model.primaryActionKey).toBe('refresh_current_quality')
    expect(model.topStatus.primaryActionKey).toBe('refresh_current_quality')
  })

  test('quality review with invalid payload is ignored even when top-level chapter id matches', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        {
          id: 202,
          review_type: 'prose_quality',
          status: 'ok',
          summary: 'This review should be ignored because payload is invalid JSON.',
          created_at: '2026-05-24T00:00:00.000Z',
          payload: '{invalid-json',
          chapter_id: 101,
        },
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_quality_check')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('refresh_current_quality')
    expect(model.primaryActionKey).toBe('refresh_current_quality')
  })

  test('low quality score requires an editor report before delivery', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              review: {
                score: 72,
                passed: false,
                status: 'fail',
                issues: [{ severity: 'medium', message: '中段拖沓' }],
                must_fix: [],
                optional_improvements: ['压缩中段解释'],
                revision_directives: ['压缩中段解释'],
                needs_revision: true,
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_revision')
    expect(model.chapterAcceptanceDesk.qualityScore).toBe(72)
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('create_editor_report')
  })

  test('stored prose accepted with warnings stays delivered while quality and state repairs remain optional', () => {
    const warningChapter = {
      ...chapters[0],
      raw_payload: {
        ...chapters[0].raw_payload,
        prose_admission: {
          status: 'accepted_with_warnings',
          quality_score: 72,
          quality_warnings: [{ code: 'quality_score_below_target', source: 'quality', message: '评分低于建议目标' }],
          story_state_status: 'pending',
          post_commit_warnings: [{ stage: 'memory', message: '记忆索引稍后补同步' }],
        },
      },
    }
    const staleProject = {
      ...project,
      reference_config: {
        ...project.reference_config,
        story_state: { ...project.reference_config.story_state, last_updated_chapter: 0 },
      },
    }

    const model = buildWritingCockpitModel({
      project: staleProject,
      outlines,
      chapters: [warningChapter, chapters[1]],
      activeChapter: warningChapter,
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview({
        payload: {
          self_check: {
            review: {
              score: 72,
              passed: false,
              status: 'warn',
              must_fix: ['强化章末钩子'],
              optional_improvements: ['压缩解释'],
            },
          },
        },
      })],
      activeRuns: [{
        id: 901,
        created_at: '2026-07-13T12:00:00.000Z',
        output_ref: JSON.stringify({
          chapter_id: warningChapter.id,
          chapter_no: warningChapter.chapter_no,
          admission_status: 'accepted',
          story_state_status: 'synced',
        }),
      }],
    })

    expect(model.chapterAcceptanceDesk.statusLabel).toBe('已入库，待同步状态机')
    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_state_sync')
    expect(model.chapterAcceptanceDesk.admissionStatus).toBe('accepted_with_warnings')
    expect(model.chapterAcceptanceDesk.qualityWarnings).toEqual([
      { code: 'quality_score_below_target', source: 'quality', message: '评分低于建议目标' },
    ])
    expect(model.chapterAcceptanceDesk.storyStateStatus).toBe('pending')
    expect(model.chapterAcceptanceDesk.postCommitWarnings).toEqual([{ stage: 'memory', message: '记忆索引稍后补同步' }])
    expect(model.chapterAcceptanceDesk.qualityScore).toBe(72)
    expect(model.chapterAcceptanceDesk.mustFix).toContain('强化章末钩子')
    expect(model.chapterAcceptanceDesk.storyStateSynced).toBe(false)
    expect(model.chapterAcceptanceDesk.storyStatePanel?.status).toBe('pending')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('sync_story_state')
    expect(model.chapterAcceptanceDesk.secondaryActions.map(action => action.key)).toEqual(expect.arrayContaining(['apply_editor_revision', 'sync_story_state']))
    expect(model.chapterAcceptanceDesk.approvalBlocker).toBeNull()
    expect(model.chapterHandoffDesk.status).toBe('needs_delivery')
    expect(model.primaryActionKey).toBe('sync_story_state')
  })

  test('accepted admission metadata overrides legacy low score must-fix and failed quality gate', () => {
    const acceptedChapter = {
      ...chapters[0],
      raw_payload: {
        ...chapters[0].raw_payload,
        proseAdmission: {
          status: 'accepted',
          qualityScore: 64,
          storyStateStatus: 'synced',
        },
      },
    }
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters: [acceptedChapter, chapters[1]],
      activeChapter: acceptedChapter,
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview({
        payload: {
          prose_admission: { status: 'blocked_invalid' },
          quality_gate: { passed: false },
          self_check: {
            review: {
              score: 64,
              passed: false,
              must_fix: ['旧门禁必须修复'],
              needs_revision: true,
            },
          },
        },
      })],
    })

    expect(model.chapterAcceptanceDesk.admissionStatus).toBe('accepted')
    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('delivered')
    expect(model.chapterAcceptanceDesk.statusLabel).toBe('已入库')
    expect(model.chapterAcceptanceDesk.approvalBlocker).toBeNull()
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
  })

  test('blocked invalid admission remains an explicit terminal blocker', () => {
    const invalidChapter = {
      ...chapters[0],
      raw_payload: {
        ...chapters[0].raw_payload,
        prose_admission: {
          status: 'blocked_invalid',
          quality_warnings: [{ code: 'invalid_prose', source: 'validation', message: '正文为空或结构无效' }],
          story_state_status: 'pending',
        },
      },
    }
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [invalidChapter, chapters[1]],
      activeChapter: invalidChapter,
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview()],
    })

    expect(model.chapterAcceptanceDesk.admissionStatus).toBe('blocked_invalid')
    expect(model.chapterAcceptanceDesk.statusLabel).toBe('正文无效，未入库')
    expect(model.chapterAcceptanceDesk.acceptanceReasons.join('；')).toContain('正文为空或结构无效')
    expect(model.chapterAcceptanceDesk.approvalBlocker?.type).toBe('blocked_invalid')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('open_generation_diagnostics')
  })

  test('blocked invalid admission remains visible when the rejected chapter has no prose', () => {
    const invalidChapter = {
      ...chapters[1],
      raw_payload: {
        ...chapters[1].raw_payload,
        prose_admission: {
          status: 'blocked_invalid',
          quality_warnings: [{ code: 'invalid_prose', source: 'validation', message: '正文为空或结构无效' }],
          story_state_status: 'pending',
        },
      },
    }
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], invalidChapter],
      activeChapter: invalidChapter,
      materialScore: { score: 82, can_generate: true },
      reviews: [],
    })

    expect(model.chapterAcceptanceDesk.visible).toBe(true)
    expect(model.chapterAcceptanceDesk.admissionStatus).toBe('blocked_invalid')
    expect(model.chapterAcceptanceDesk.statusLabel).toBe('正文无效，未入库')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('open_generation_diagnostics')
  })

  test('restores a no-prose blocked invalid terminal state from a standalone run record', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[1],
      materialScore: { score: 82, can_generate: true },
      reviews: [],
      activeRuns: [{
        id: 901,
        run_type: 'generate_prose',
        status: 'failed',
        created_at: '2026-07-13T12:00:00.000Z',
        output_ref: JSON.stringify({
          error: '正文为空或结构无效',
          error_code: 'PROSE_ADMISSION_BLOCKED_INVALID',
          admission_status: 'blocked_invalid',
          chapter_id: 102,
          chapter_no: 2,
          pipeline: [{ key: 'review', status: 'failed' }],
        }),
      }],
    })

    expect(model.chapterAcceptanceDesk.visible).toBe(true)
    expect(model.chapterAcceptanceDesk.admissionStatus).toBe('blocked_invalid')
    expect(model.chapterAcceptanceDesk.statusLabel).toBe('正文无效，未入库')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('open_generation_diagnostics')
  })

  test('does not reuse a top-level run admission from a different chapter', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [],
      activeRuns: [{
        id: 801,
        created_at: '2026-07-13T10:00:00.000Z',
        output_ref: JSON.stringify({
          chapter_id: 102,
          chapter_no: 2,
          admission_status: 'blocked_invalid',
          quality_warnings: [{ source: 'validation', code: 'invalid_prose', message: '第二章正文无效' }],
        }),
      }],
    })

    expect(model.chapterAcceptanceDesk.admissionStatus).toBe('')
    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_quality_check')
  })

  test('uses the latest persisted run admission for the current chapter regardless of input order', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [],
      activeRuns: [
        {
          id: 802,
          created_at: '2026-07-13T11:00:00.000Z',
          output_ref: JSON.stringify({
            chapter_id: 101,
            chapter_no: 1,
            admission_status: 'accepted_with_warnings',
            quality_score: 72,
            story_state_status: 'pending',
            quality_warnings: [{ source: 'quality', code: 'score_low', message: '评分低于建议目标' }],
          }),
        },
        {
          id: 801,
          created_at: '2026-07-13T10:00:00.000Z',
          output_ref: JSON.stringify({
            chapter_id: 101,
            chapter_no: 1,
            admission_status: 'accepted',
            story_state_status: 'synced',
          }),
        },
      ],
    })

    expect(model.chapterAcceptanceDesk.admissionStatus).toBe('accepted_with_warnings')
    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_state_sync')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('sync_story_state')
    expect(model.chapterAcceptanceDesk.qualityWarnings[0]?.message).toBe('评分低于建议目标')
  })

  test('ignores stale blocked_invalid runs when the chapter already has stored prose', () => {
    const writtenChapter = {
      ...chapters[0],
      chapter_text: '盟友已经入局，通道尽头的裂缝又裂开一寸。'.repeat(40),
      raw_payload: {
        ...(chapters[0].raw_payload || {}),
      },
    }
    delete (writtenChapter.raw_payload as any).prose_admission
    delete (writtenChapter.raw_payload as any).proseAdmission
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [writtenChapter, chapters[1]],
      activeChapter: writtenChapter,
      materialScore: { score: 82, can_generate: true },
      reviews: [],
      activeRuns: [
        {
          id: 431,
          status: 'success',
          created_at: '2026-07-14T03:22:23.483Z',
          output_ref: JSON.stringify({
            truncated: true,
            reason: 'storage_compaction',
            chapter_id: writtenChapter.id,
            chapter_no: writtenChapter.chapter_no,
            admission_status: 'accepted_with_warnings',
            quality_warnings: [{ source: 'quality', code: 'quality_advisory', message: '替换一级禁用词' }],
            preview: '{"chapter":{"id":' + writtenChapter.id + ',"chapter_no":' + writtenChapter.chapter_no + '}}',
          }),
        },
        {
          id: 430,
          status: 'failed',
          created_at: '2026-07-14T03:06:57.786Z',
          output_ref: JSON.stringify({
            error: '模型未返回正文',
            error_code: 'PROSE_ADMISSION_BLOCKED_INVALID',
            admission_status: 'blocked_invalid',
            chapter_id: writtenChapter.id,
            chapter_no: writtenChapter.chapter_no,
          }),
        },
      ],
    })

    expect(model.chapterAcceptanceDesk.admissionStatus).toBe('accepted_with_warnings')
    expect(model.chapterAcceptanceDesk.statusLabel).toBe('已入库，建议修订')
    expect(model.chapterAcceptanceDesk.approvalBlocker).toBeNull()
  })

  test('does not terminal-block a written chapter from an older failed admission-only run', () => {
    const writtenChapter = {
      ...chapters[0],
      chapter_text: '通道里的雾气更浓，老陈的呼吸声贴着岩壁。'.repeat(40),
      has_prose: true,
      word_count: 2400,
      raw_payload: {},
    }
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [writtenChapter, chapters[1]],
      activeChapter: writtenChapter,
      materialScore: { score: 82, can_generate: true },
      reviews: [],
      activeRuns: [{
        id: 430,
        status: 'failed',
        created_at: '2026-07-14T03:06:57.786Z',
        output_ref: JSON.stringify({
          error: '模型未返回正文',
          error_code: 'PROSE_ADMISSION_BLOCKED_INVALID',
          admission_status: 'blocked_invalid',
          chapter_id: writtenChapter.id,
          chapter_no: writtenChapter.chapter_no,
        }),
      }],
    })

    expect(model.chapterAcceptanceDesk.admissionStatus).not.toBe('blocked_invalid')
    expect(model.chapterAcceptanceDesk.statusLabel).not.toBe('正文无效，未入库')
  })

  test('surfaces a clear story-state panel and primary sync action when prose is stored but state is pending', () => {
    const writtenChapter = {
      ...chapters[0],
      chapter_text: '通道尽头的裂缝又裂开一寸，老陈的符文随之颤了一下。'.repeat(30),
      raw_payload: {
        ...(chapters[0].raw_payload || {}),
        prose_admission: {
          status: 'accepted_with_warnings',
          quality_score: 88,
          story_state_status: 'pending',
          story_state_warning: {
            hard_failures: [
              { key: 'character_state_delta_sync', message: '本章计划的关键状态变化未记录：character_state_delta_sync' },
              { key: 'chapter_handoff_delta_sync', message: '本章计划的关键状态变化未记录：chapter_handoff_delta_sync' },
            ],
          },
          quality_warnings: [{ source: 'quality', code: 'quality_advisory', message: '替换一级禁用词' }],
        },
      },
    }
    const model = buildWritingCockpitModel({
      project: {
        ...project,
        reference_config: {
          ...(project.reference_config || {}),
          story_state: { last_updated_chapter: 10 },
        },
      },
      outlines,
      chapters: [writtenChapter, chapters[1]],
      activeChapter: writtenChapter,
      materialScore: { score: 82, can_generate: true },
      reviews: [],
    })

    expect(model.chapterAcceptanceDesk.visible).toBe(true)
    expect(model.chapterAcceptanceDesk.storyStateSynced).toBe(false)
    expect(model.chapterAcceptanceDesk.storyStatePanel?.status).toBe('pending')
    expect(model.chapterAcceptanceDesk.storyStatePanel?.headline).toContain('尚未写入')
    expect(model.chapterAcceptanceDesk.storyStatePanel?.reasons.join('；')).toContain('character_state_delta_sync')
    expect(model.chapterAcceptanceDesk.storyStatePanel?.primaryAction?.key).toBe('sync_story_state')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('sync_story_state')
    expect(model.chapterAcceptanceDesk.statusLabel).toContain('待同步状态机')
  })

  test('explains draft_only mode skip and still offers manual story-state sync', () => {
    const writtenChapter = {
      ...chapters[0],
      chapter_text: '他把秩序核心捏进掌心，决定先活着离开回廊。'.repeat(30),
      raw_payload: {
        prose_admission: {
          status: 'accepted',
          story_state_status: 'pending',
          story_state_warning: {
            skipped: true,
            reason: 'draft_only production mode',
          },
        },
      },
    }
    const model = buildWritingCockpitModel({
      project: {
        ...project,
        reference_config: { story_state: { last_updated_chapter: 0 } },
      },
      outlines,
      chapters: [writtenChapter, chapters[1]],
      activeChapter: writtenChapter,
      materialScore: { score: 82, can_generate: true },
      reviews: [],
    })

    expect(model.chapterAcceptanceDesk.storyStatePanel?.status).toBe('skipped')
    expect(model.chapterAcceptanceDesk.storyStatePanel?.summary).toContain('不会自动写状态机')
    expect(model.chapterAcceptanceDesk.storyStatePanel?.primaryAction?.label).toContain('同步故事状态')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('sync_story_state')
  })

  test('shows established event preview when present', () => {
    const writtenChapter = {
      ...chapters[0],
      chapter_no: 2,
      chapter_text: '他把秩序核心捏进掌心，决定先活着离开回廊。'.repeat(30),
      raw_payload: {
        prose_admission: {
          status: 'accepted',
          story_state_status: 'synced',
        },
      },
    }
    const model = buildWritingCockpitModel({
      project: {
        ...project,
        reference_config: {
          story_state: {
            last_updated_chapter: 2,
            established_events: [
              {
                kind: 'death',
                subject: '林战',
                predicate: '死亡方式',
                fact: '林战因违规开门被剥皮而死',
                status: 'confirmed',
                lock_level: 'hard',
                source_excerpt: '开了不该开的门',
              },
            ],
          },
        },
      },
      outlines,
      chapters: [writtenChapter, chapters[1]],
      activeChapter: writtenChapter,
      materialScore: { score: 82, can_generate: true },
      reviews: [],
    })

    expect(model.chapterAcceptanceDesk.storyStatePanel?.establishedEvents?.confirmedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.storyStatePanel?.establishedEvents?.preview[0]).toContain('林战')
  })

  test('readability review is summarized without blocking chapter acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        readabilityReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.readabilityReview?.score).toBe(82)
    expect(model.chapterAcceptanceDesk.readabilityReview?.scoreLabel).toBe('可读性 82')
    expect(model.chapterAcceptanceDesk.readabilityReview?.memeLabel).toBe('网感轻度')
    expect(model.chapterAcceptanceDesk.readabilityReview?.riskLabel).toBe('出戏风险 1')
  })

  test('readability review surfaces oh-story deslop risks as soft repair work', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        readabilityReview({
          payload: {
            readability_review: {
              readability_score: 84,
              meme_sense: { intensity: '克制', immersion_risks: [] },
              ai_smell: {
                level: '中度',
                pattern_hits: [
                  { type: '禁用词', evidence: '眼神复杂' },
                  { type: '总结体', evidence: '新的篇章开始了' },
                ],
                rewrite_tactics: ['删总结体', '用动作代替抽象心理'],
              },
              issues: [],
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.readabilityReview?.aiSmellRisk).toBe(true)
    expect(model.chapterAcceptanceDesk.readabilityReview?.aiSmellHitCount).toBe(2)
    expect(model.chapterAcceptanceDesk.readabilityReview?.aiSmellLabel).toBe('AI味中度 2')
    expect(model.chapterAcceptanceDesk.readabilityReview?.riskLabel).toBe('AI味中度 2')
    expect(model.chapterAcceptanceDesk.readabilityReview?.aiSmellTactics).toContain('删总结体')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('去AI味：AI味中度 2')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先去AI味')
  })

  test('surfaces scene-card receipt failures as repairable delivery work', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          status: 'warn',
          payload: {
            self_check: {
              review: {
                score: 84,
                passed: false,
                status: 'warn',
                issues: [],
                quality_audit_checks: [
                  {
                    key: 'scene_card_receipt_2_undelivered',
                    label: '场景卡回执证据复核',
                    status: 'fail',
                    scene_no: 2,
                    fields: ['目标/阻碍/状态变化', '感知锚点'],
                    evidence: '场景2《盟友改口》scene_card_receipts 标记未兑现。',
                    fix: '按 delivered=false 的字段修正文，再重写 scene_card_receipts。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('复核场景回执：场景回执缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先复核场景')
  })

  test('reads nested scene-card delivery receipts as repairable delivery work', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          status: 'warn',
          payload: {
            self_check: {
              review: {
                score: 84,
                passed: false,
                status: 'warn',
                issues: [],
                quality_audit_checks: [],
                oh_story_delivery_receipts: {
                  scene_card_receipts: [
                    {
                      scene_no: 2,
                      title: '盟友改口',
                      delivered: false,
                      fields: ['目标/阻碍/状态变化', '感知锚点'],
                      remaining_risk: '场景卡要求盟友当场改口，但正文只写了沉默。',
                      evidence: '场景2没有出现改口动作。',
                    },
                  ],
                },
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.sceneCardReceipt?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.sceneCardReceipt?.label).toBe('场景回执缺口 1')
    expect(model.chapterAcceptanceDesk.sceneCardReceipt?.scenes).toContain('场景2')
    expect(model.chapterAcceptanceDesk.sceneCardReceipt?.fields).toContain('目标/阻碍/状态变化')
    expect(model.chapterAcceptanceDesk.sceneCardReceipt?.evidence.join('；')).toContain('场景卡要求盟友当场改口')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('复核场景回执：场景回执缺口 1')
  })

  test('surfaces quality audit failures as repairable delivery work', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          status: 'warn',
          payload: {
            self_check: {
              review: {
                score: 84,
                passed: false,
                status: 'warn',
                issues: [],
                quality_audit_checks: [
                  {
                    key: 'purpose_tag_density_gap',
                    label: '目的词详略分配',
                    status: 'fail',
                    evidence: '爽点场景只用一句摘要带过，过渡场景反而展开三段环境描写。',
                    fix: '按目的词重排详略：爽点/打脸展开出手过程，过渡压缩到1-2句。',
                    strategy: 'rewrite',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.qualityAudit?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.qualityAudit?.label).toBe('质量诊断缺口 1')
    expect(model.chapterAcceptanceDesk.qualityAudit?.checks).toContain('目的词详略分配')
    expect(model.chapterAcceptanceDesk.qualityAudit?.evidence[0]).toContain('爽点场景只用一句摘要带过')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('修质量诊断：质量诊断缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修质量诊断')
  })

  test('surfaces quality audit sync misses as next-chapter quality carry-over', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        qualityAuditSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.qualityAuditSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.qualityAuditSync?.label).toBe('质量诊断缺口 2')
    expect(model.chapterAcceptanceDesk.qualityAuditSync?.missedCount).toBe(2)
    expect(model.chapterAcceptanceDesk.qualityAuditSync?.evidence.join('｜')).toContain('信息负载')
    expect(model.chapterAcceptanceDesk.qualityAuditSync?.nextActions.join('｜')).toContain('本章不可删除')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补诊断承接：质量诊断缺口 2')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补质量诊断')
  })

  test('surfaces quality audit repair receipt gaps as a delivery risk queue item', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        qualityAuditRepairReceiptSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.qualityAuditRepairReceiptSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.qualityAuditRepairReceiptSync?.label).toBe('质量诊断修复回执缺口 1')
    expect(model.chapterAcceptanceDesk.qualityAuditRepairReceiptSync?.missedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.qualityAuditRepairReceiptSync?.receiptCount).toBe(2)
    expect(model.chapterAcceptanceDesk.qualityAuditRepairReceiptSync?.evidence.join('｜')).toContain('changed_evidence')
    expect(model.chapterAcceptanceDesk.qualityAuditRepairReceiptSync?.nextActions.join('｜')).toContain('quality_audit_repair_receipts')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('复核质量修复回执：质量诊断修复回执缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补质量回执')
  })

  test('surfaces chapter handoff sync gaps as repairable continuity work', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        chapterHandoffSyncReview(),
        chapterHandoffDeltaSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.chapterHandoffSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.chapterHandoffSync?.label).toBe('章首承接缺口 2')
    expect(model.chapterAcceptanceDesk.chapterHandoffSync?.missedCount).toBe(2)
    expect(model.chapterAcceptanceDesk.chapterHandoffSync?.evidence.join('｜')).toContain('玻璃门水痕')
    expect(model.chapterAcceptanceDesk.chapterHandoffDeltaSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.chapterHandoffDeltaSync?.label).toBe('章末交接缺口 1')
    expect(model.chapterAcceptanceDesk.chapterHandoffDeltaSync?.missedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.chapterHandoffDeltaSync?.nextActions.join('｜')).toContain('先追查第三个人')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补章首承接：章首承接缺口 2')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补章末交接：章末交接缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补章首承接')
  })

  test('surfaces oh-story intent and benchmark recall sync gaps as repairable delivery work', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        intentConfirmationSyncReview(),
        benchmarkRecallSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.intentConfirmationSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.intentConfirmationSync?.label).toBe('意图确认缺口 2')
    expect(model.chapterAcceptanceDesk.intentConfirmationSync?.missedCount).toBe(2)
    expect(model.chapterAcceptanceDesk.intentConfirmationSync?.evidence.join('｜')).toContain('章尾承接')
    expect(model.chapterAcceptanceDesk.intentConfirmationSync?.nextActions.join('｜')).toContain('写前意图')
    expect(model.chapterAcceptanceDesk.benchmarkRecallSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.benchmarkRecallSync?.label).toBe('文风召回缺口 1')
    expect(model.chapterAcceptanceDesk.benchmarkRecallSync?.missedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.benchmarkRecallSync?.evidence.join('｜')).toContain('节奏参照')
    expect(model.chapterAcceptanceDesk.benchmarkRecallSync?.nextActions.join('｜')).toContain('不复制桥段原句')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补意图确认：意图确认缺口 2')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补文风召回：文风召回缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补意图确认')
  })

  test('surfaces nested pre-draft execution receipt misses as repairable delivery work', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                intent_confirmation_checks: [
                  {
                    key: 'emotion_target',
                    label: '情绪目标',
                    delivered: false,
                    evidence: '正文只写了断臂回府，没有从压抑转为当众夺回主动权。',
                    remaining_risk: '写前意图里的情绪反转没有落到正文。',
                  },
                ],
                benchmark_recall_checks: [
                  {
                    key: 'rhythm_reference',
                    label: '节奏参照',
                    delivered: false,
                    evidence: '爆发后没有冷却承接，直接跳到总结。',
                    remaining_risk: '文风召回里的先压后爆没有执行。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.intentConfirmationSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.intentConfirmationSync?.label).toBe('意图确认缺口 1')
    expect(model.chapterAcceptanceDesk.intentConfirmationSync?.missedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.intentConfirmationSync?.evidence.join('｜')).toContain('写前意图里的情绪反转没有落到正文')
    expect(model.chapterAcceptanceDesk.benchmarkRecallSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.benchmarkRecallSync?.label).toBe('文风召回缺口 1')
    expect(model.chapterAcceptanceDesk.benchmarkRecallSync?.missedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.benchmarkRecallSync?.evidence.join('｜')).toContain('文风召回里的先压后爆没有执行')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补意图确认：意图确认缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补文风召回：文风召回缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补意图确认')
  })

  test('surfaces write-preparation execution misses as repairable delivery work', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                write_preparation_checks: [
                  {
                    key: 'asset_linkage',
                    label: '旧钥匙挂钩',
                    delivered: false,
                    evidence: '正文用了旧钥匙开门，但没交代旧钥匙和母亲旧铺印记的关系。',
                    remaining_risk: '孤立资产仍未挂到主线证据链。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.writePreparation?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.writePreparation?.label).toBe('写前准备缺口 1')
    expect(model.chapterAcceptanceDesk.writePreparation?.missedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.writePreparation?.evidence.join('｜')).toContain('孤立资产仍未挂到主线证据链')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补写前准备：写前准备缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补写前准备')
  })

  test('surfaces prose self-review chapter handoff misses as repairable delivery work', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              review: {
                score: 86,
                passed: true,
                status: 'pass',
                issues: [],
                chapter_handoff_checks: [
                  {
                    key: 'opening_obligation',
                    label: '开篇义务',
                    status: 'warn',
                    evidence: '前300字直接切到新场景，没有接住上一章玻璃门水痕。',
                    fix: '先让主角回到玻璃门前确认水痕名单，再推进新线索。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.chapterHandoffSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.chapterHandoffSync?.label).toBe('章首承接缺口 1')
    expect(model.chapterAcceptanceDesk.chapterHandoffSync?.missedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.chapterHandoffSync?.evidence.join('｜')).toContain('前300字直接切到新场景')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补章首承接：章首承接缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补章首承接')
  })

  test('surfaces source readiness misses as repairable delivery work', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                source_readiness_checks: [
                  {
                    key: 'artifact_state',
                    label: '黑色钥匙状态',
                    status: 'warn',
                    evidence: '正文把黑色钥匙当成已解锁道具，但写前来源表标记为 missing。',
                    fix: '先补角色确认钥匙来源和限制，再让它参与本章反制。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.sourceReadiness?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.sourceReadiness?.label).toBe('来源就绪缺口 1')
    expect(model.chapterAcceptanceDesk.sourceReadiness?.missedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.sourceReadiness?.evidence.join('｜')).toContain('黑色钥匙当成已解锁道具')
    expect(model.chapterAcceptanceDesk.sourceReadiness?.nextActions.join('｜')).toContain('确认钥匙来源和限制')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补来源就绪：来源就绪缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补来源')
  })

  test('surfaces state tracking misses as repairable delivery work', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                state_tracking_checks: [
                  {
                    key: 'character_state',
                    label: '周远状态',
                    status: 'fail',
                    evidence: '正文让周远直接出手，但上一章状态仍是昏迷未醒。',
                    fix: '先补周远苏醒代价和行动限制，再参与本章选择。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.stateTracking?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.stateTracking?.label).toBe('状态跟踪缺口 1')
    expect(model.chapterAcceptanceDesk.stateTracking?.missedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.stateTracking?.evidence.join('｜')).toContain('上一章状态仍是昏迷未醒')
    expect(model.chapterAcceptanceDesk.stateTracking?.nextActions.join('｜')).toContain('苏醒代价和行动限制')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补状态跟踪：状态跟踪缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补状态')
  })

  test('surfaces style boundary misses as repairable delivery work', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                style_boundary_checks: [
                  {
                    key: 'source_copy_risk',
                    label: '参照句式过近',
                    status: 'warn',
                    evidence: '正文连续三句沿用标杆样章的句式节奏，只有名词替换。',
                    fix: '保留压迫感，但改用本章动作链和角色口吻重写。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.styleBoundary?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.styleBoundary?.label).toBe('风格边界缺口 1')
    expect(model.chapterAcceptanceDesk.styleBoundary?.evidence.join('｜')).toContain('标杆样章的句式节奏')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('校风格边界：风格边界缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先校风格边界')
  })

  test('surfaces information flow misses as repairable delivery work', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                information_flow_checks: [
                  {
                    key: 'reveal_order',
                    label: '线索揭示顺序',
                    status: 'fail',
                    evidence: '正文先解释封条真相，再让主角发现供词，导致悬念提前泄底。',
                    fix: '先写主角误判和供词异常，再用封条真相收束本场。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.informationFlow?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.informationFlow?.label).toBe('信息流缺口 1')
    expect(model.chapterAcceptanceDesk.informationFlow?.evidence.join('｜')).toContain('悬念提前泄底')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('调信息流：信息流缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先调信息流')
  })

  test('surfaces expectation threshold misses as repairable delivery work', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              review: {
                score: 84,
                passed: true,
                status: 'pass',
                issues: [],
                expectation_threshold_checks: [
                  {
                    key: 'page_turn_question',
                    label: '章末追问强度',
                    status: 'warn',
                    evidence: '章末只说封条异常，没有形成读者必须点下一章的具体问题。',
                    fix: '把封条异常落到一个未揭身份、代价或选择压力上。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.expectationThreshold?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.expectationThreshold?.label).toBe('期待阈值缺口 1')
    expect(model.chapterAcceptanceDesk.expectationThreshold?.evidence.join('｜')).toContain('必须点下一章')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补期待阈值：期待阈值缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补期待阈值')
  })

})
