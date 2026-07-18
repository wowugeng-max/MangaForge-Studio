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

describe('buildWritingCockpitModel planning a', () => {
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

})
