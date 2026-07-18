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

describe('buildWritingCockpitModel acceptance b', () => {
  test('surfaces reader retention checks as repairable delivery work', () => {
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
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.readerRetentionCheck?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.readerRetentionCheck?.label).toBe('追读雷达缺口 1')
    expect(model.chapterAcceptanceDesk.readerRetentionCheck?.evidence.join('｜')).toContain('没有信息差植入问号')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('创作契约：追读留存缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修创作契约')
  })

  test('surfaces target reader checks as repairable delivery work', () => {
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
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.targetReader?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.targetReader?.label).toBe('目标读者缺口 1')
    expect(model.chapterAcceptanceDesk.targetReader?.evidence.join('｜')).toContain('缺核心痛苦')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('创作契约：目标读者缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修创作契约')
  })

  test('surfaces genre positioning checks as repairable delivery work', () => {
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
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.genrePositioning?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.genrePositioning?.label).toBe('题材定位缺口 1')
    expect(model.chapterAcceptanceDesk.genrePositioning?.evidence.join('｜')).toContain('核心梗')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('创作契约：题材定位缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修创作契约')
  })

  test('surfaces female audience checks as repairable delivery work', () => {
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
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.femaleAudience?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.femaleAudience?.label).toBe('女频长篇缺口 1')
    expect(model.chapterAcceptanceDesk.femaleAudience?.evidence.join('｜')).toContain('被长老安排着赢')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补女频：女频长篇缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补女频长篇')
  })

  test('surfaces upgrade rhythm checks as repairable delivery work', () => {
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
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.upgradeRhythm?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.upgradeRhythm?.label).toBe('升级节奏缺口 1')
    expect(model.chapterAcceptanceDesk.upgradeRhythm?.evidence.join('｜')).toContain('升级前情绪缺口')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补升级：升级节奏缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补升级节奏')
  })

  test('surfaces chapter structure and progression checks as repairable delivery work', () => {
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
                score: 81,
                passed: false,
                status: 'warn',
                issues: [],
                structure_checks: [
                  {
                    key: 'missing_turning_structure',
                    label: '章节结构',
                    status: 'fail',
                    evidence: '本章开头没有钩子，中段只复述旧设定，局势没有变化，结尾落在总结而不是新的发现或危机。',
                    fix: '补开头钩子、中段推进、局势变化和章尾翻页。',
                  },
                ],
                progression_checks: [
                  {
                    key: 'deletable_chapter',
                    label: '章节推进',
                    status: 'warn',
                    evidence: '删掉这章不影响理解，主线、关系、设定都没有可见位移。',
                    fix: '补本章不可删除的证据、选择、代价或关系变化。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_revision')
    expect(model.chapterAcceptanceDesk.chapterStructure?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.chapterStructure?.label).toBe('章节结构缺口 1')
    expect(model.chapterAcceptanceDesk.chapterStructure?.evidence.join('｜')).toContain('开头没有钩子')
    expect(model.chapterAcceptanceDesk.chapterProgression?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.chapterProgression?.label).toBe('章节推进缺口 1')
    expect(model.chapterAcceptanceDesk.chapterProgression?.evidence.join('｜')).toContain('删掉这章不影响理解')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补结构：章节结构缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补推进：章节推进缺口 1')
  })

  test('surfaces information load and longform checks as repairable delivery work', () => {
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
                score: 80,
                passed: false,
                status: 'warn',
                issues: [],
                information_checks: [
                  {
                    key: 'concept_overload',
                    label: '信息负载',
                    status: 'fail',
                    evidence: '本章一次性解释三套阵法、两条宗门规则和旧印来历，信息没有跟着冲突走，读者还没看到动作就被设定淹没。',
                    fix: '压缩新概念到三个以内，把旧印规则放进冲突反馈里释放。',
                  },
                ],
                longform_checks: [
                  {
                    key: 'recent_progress_stalled',
                    label: '长篇连续性',
                    status: 'warn',
                    evidence: '最近5章都在解释旧印背景，没有明确进展，爽点间隔过长，读者看不到阶段目标推进。',
                    fix: '补最近5章的阶段位移、爽点间隔和下一阶段目标。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_revision')
    expect(model.chapterAcceptanceDesk.informationLoad?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.informationLoad?.label).toBe('信息负载缺口 1')
    expect(model.chapterAcceptanceDesk.informationLoad?.evidence.join('｜')).toContain('信息没有跟着冲突走')
    expect(model.chapterAcceptanceDesk.longformContinuity?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.longformContinuity?.label).toBe('长篇连续性缺口 1')
    expect(model.chapterAcceptanceDesk.longformContinuity?.evidence.join('｜')).toContain('最近5章')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('压信息：信息负载缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('保长篇：长篇连续性缺口 1')
  })

  test('surfaces core contract and continuity heat checks as repairable delivery work', () => {
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
                score: 79,
                passed: false,
                status: 'warn',
                issues: [],
                core_contract_checks: [
                  {
                    key: 'theme_unity_rules',
                    label: '核心契约',
                    status: 'fail',
                    evidence: '本章追逐支线宝物，主角没有服务规则反制的核心承诺，小情绪没有服从全书核心情绪。',
                    fix: '把支线宝物改成规则判定证据，让主角用规则反制兑现核心承诺。',
                  },
                ],
                continuity_heat_checks: [
                  {
                    key: 'cold_recall_without_warmup',
                    label: '连续性热度',
                    status: 'warn',
                    evidence: '旧印作为 hot 元素本章只提名字没有推进，cold 伏笔突然回收前没有升温。',
                    fix: '让旧印触发新证据推进，cold 回收前先给一处可见升温。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_revision')
    expect(model.chapterAcceptanceDesk.coreContractCheck?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.coreContractCheck?.label).toBe('核心契约缺口 1')
    expect(model.chapterAcceptanceDesk.coreContractCheck?.evidence.join('｜')).toContain('核心承诺')
    expect(model.chapterAcceptanceDesk.continuityHeat?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.continuityHeat?.label).toBe('连续性热度缺口 1')
    expect(model.chapterAcceptanceDesk.continuityHeat?.evidence.join('｜')).toContain('cold 伏笔突然回收前没有升温')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('创作契约：核心承诺缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补热度：连续性热度缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修创作契约')
  })

  test('surfaces revision receipt and deslop repair checks as repairable delivery work', () => {
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
                score: 78,
                passed: false,
                status: 'warn',
                issues: [],
                revision_receipt_checks: [
                  {
                    key: 'prose_revision_receipt_sync',
                    label: '修订回执',
                    status: 'fail',
                    evidence: 'delivery_risk_receipts 要求修正文首钩子，但 revision_receipts 没有给 changed_evidence。',
                    fix: '重新输出 revision_receipts。',
                  },
                ],
                deslop_repair_checks: [
                  {
                    key: 'deslop_repair_receipt_sync',
                    label: '去AI味修复',
                    status: 'warn',
                    evidence: 'Gate E 模板化对白仍残留，但 deslop_repair_receipts 没有引用修订后正文证据。',
                    fix: '重修 Gate E 对话腔调。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_revision')
    expect(model.chapterAcceptanceDesk.revisionReceiptCheck?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.revisionReceiptCheck?.label).toBe('修订回执缺口 1')
    expect(model.chapterAcceptanceDesk.revisionReceiptCheck?.evidence.join('｜')).toContain('changed_evidence')
    expect(model.chapterAcceptanceDesk.deslopRepairCheck?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.deslopRepairCheck?.label).toBe('去AI味修复缺口 1')
    expect(model.chapterAcceptanceDesk.deslopRepairCheck?.evidence.join('｜')).toContain('Gate E')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补回执：修订回执缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补去味：去AI味修复缺口 1')
  })

  test('surfaces prose meta and serial risk repair checks as repairable delivery work', () => {
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
                score: 77,
                passed: false,
                status: 'warn',
                issues: [],
                prose_meta_checks: [
                  {
                    key: 'meta_narration_leak',
                    label: '正文元叙事',
                    status: 'fail',
                    evidence: '正文出现“这一章主要用来铺垫后续反转”这类作者说明，破坏读者沉浸。',
                    fix: '删除作者说明。',
                  },
                ],
                serial_risk_repair_checks: [
                  {
                    key: 'scene_serial_risk_unrepaired',
                    label: '连续风险修复',
                    status: 'warn',
                    evidence: '安全批量标记场景承接风险，但修订稿没有补 scene_serial_risk_repair_receipt。',
                    fix: '补齐连续生产风险修复回执。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_revision')
    expect(model.chapterAcceptanceDesk.proseMeta?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.proseMeta?.label).toBe('正文元叙事缺口 1')
    expect(model.chapterAcceptanceDesk.proseMeta?.evidence.join('｜')).toContain('作者说明')
    expect(model.chapterAcceptanceDesk.serialRiskRepair?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.serialRiskRepair?.label).toBe('连续风险修复缺口 1')
    expect(model.chapterAcceptanceDesk.serialRiskRepair?.evidence.join('｜')).toContain('场景承接风险')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('删元叙：正文元叙事缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补连修：连续风险修复缺口 1')
  })

  test('surfaces chapter hook quality checks as repairable delivery work', () => {
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
                score: 77,
                passed: false,
                status: 'warn',
                issues: [],
                chapter_hook_quality_checks: [
                  {
                    key: 'ending_hook_weak_pull',
                    label: '章钩质量',
                    status: 'warn',
                    evidence: '章尾只写“新的麻烦来了”，没有具体问题、危险、选择或下一章行动压力。',
                    fix: '把章尾改成可追读的具体未解问题。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_revision')
    expect(model.chapterAcceptanceDesk.chapterHookQuality?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.chapterHookQuality?.label).toBe('章钩质量缺口 1')
    expect(model.chapterAcceptanceDesk.chapterHookQuality?.evidence.join('｜')).toContain('下一章行动压力')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('强章钩：章钩质量缺口 1')
  })

  test('chapter attraction review is summarized as a repairable reader pull risk', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        chapterAttractionReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.chapterAttraction?.score).toBe(62)
    expect(model.chapterAcceptanceDesk.chapterAttraction?.scoreLabel).toBe('吸引力 62')
    expect(model.chapterAcceptanceDesk.chapterAttraction?.label).toBe('吸引力缺口 3')
    expect(model.chapterAcceptanceDesk.chapterAttraction?.priorityLabel).toBe('优先修章末翻页')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('修吸引力：吸引力缺口 3')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修章末翻页')
  })

  test('story drive sync is summarized as a protagonist choice and consequence risk', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        storyDriveSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.storyDriveSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.storyDriveSync?.scoreLabel).toBe('故事力 60')
    expect(model.chapterAcceptanceDesk.storyDriveSync?.label).toBe('故事力缺口 3')
    expect(model.chapterAcceptanceDesk.storyDriveSync?.missedCount).toBe(3)
    expect(model.chapterAcceptanceDesk.storyDriveSync?.priorityLabel).toBe('优先补主角选择')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补故事力：故事力缺口 3')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补主角选择')
  })

  test('character arc sync is summarized as a growth and relationship risk', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        characterArcSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.characterArcSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.characterArcSync?.scoreLabel).toBe('人物弧光 58')
    expect(model.chapterAcceptanceDesk.characterArcSync?.label).toBe('人物弧光缺口 3')
    expect(model.chapterAcceptanceDesk.characterArcSync?.missedCount).toBe(3)
    expect(model.chapterAcceptanceDesk.characterArcSync?.priorityLabel).toBe('优先补成长节点')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补人物弧光：人物弧光缺口 3')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补成长节点')
  })

  test('weak opening hook score is summarized as an opening pull repair risk', () => {
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
              opening_hook_score: 52,
              scene_readability_score: 82,
              meme_sense: { intensity: '轻度', immersion_risks: [] },
              issues: [],
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.readabilityReview?.openingHookScore).toBe(52)
    expect(model.chapterAcceptanceDesk.readabilityReview?.openingHookLabel).toBe('开篇吸引力 52')
    expect(model.chapterAcceptanceDesk.readabilityReview?.riskLabel).toBe('开篇吸引力弱 52')
    expect(model.chapterAcceptanceDesk.readabilityReview?.riskCount).toBe(1)
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('修开篇吸引力：开篇吸引力弱 52')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修开篇')
  })

  test('weak ending hook score is summarized as a page-turn repair risk', () => {
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
              readability_score: 83,
              opening_hook_score: 82,
              ending_hook_score: 55,
              scene_readability_score: 80,
              meme_sense: { intensity: '轻度', immersion_risks: [] },
              issues: [],
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.readabilityReview?.endingHookScore).toBe(55)
    expect(model.chapterAcceptanceDesk.readabilityReview?.endingHookLabel).toBe('章末翻页 55')
    expect(model.chapterAcceptanceDesk.readabilityReview?.riskLabel).toBe('章末翻页弱 55')
    expect(model.chapterAcceptanceDesk.readabilityReview?.riskCount).toBe(1)
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('修章末翻页：章末翻页弱 55')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修章末')
  })

  test('weak scene readability score is summarized as a scene progression repair risk', () => {
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
              readability_score: 82,
              opening_hook_score: 82,
              ending_hook_score: 82,
              scene_readability_score: 58,
              payoff_density_score: 80,
              meme_sense: { intensity: '轻度', immersion_risks: [] },
              issues: [],
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.readabilityReview?.sceneReadabilityScore).toBe(58)
    expect(model.chapterAcceptanceDesk.readabilityReview?.sceneReadabilityLabel).toBe('场景推进 58')
    expect(model.chapterAcceptanceDesk.readabilityReview?.riskLabel).toBe('场景推进弱 58')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('修场景推进：场景推进弱 58')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修场景')
  })

  test('weak payoff density score is summarized as a payoff density repair risk', () => {
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
              readability_score: 82,
              opening_hook_score: 82,
              ending_hook_score: 82,
              scene_readability_score: 82,
              payoff_density_score: 56,
              meme_sense: { intensity: '轻度', immersion_risks: [] },
              issues: [],
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.readabilityReview?.payoffDensityScore).toBe(56)
    expect(model.chapterAcceptanceDesk.readabilityReview?.payoffDensityLabel).toBe('爽点密度 56')
    expect(model.chapterAcceptanceDesk.readabilityReview?.riskLabel).toBe('爽点密度弱 56')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补爽点密度：爽点密度弱 56')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补爽点')
  })

  test('reader retention sync is summarized without blocking chapter acceptance', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        readerRetentionSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.readerRetentionSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.readerRetentionSync?.label).toBe('漏追读 2')
    expect(model.chapterAcceptanceDesk.readerRetentionSync?.scoreLabel).toBe('追读兑现 68')
    expect(model.chapterAcceptanceDesk.readerRetentionSync?.missedCount).toBe(2)
  })

  test('reader expectation sync is summarized and prioritized as a soft repair risk', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        readerExpectationSyncReview(),
        readerRetentionSyncReview(),
        readerPayoffSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.readerExpectationSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.readerExpectationSync?.label).toBe('期待欠账 1')
    expect(model.chapterAcceptanceDesk.readerExpectationSync?.scoreLabel).toBe('期待兑现 70')
    expect(model.chapterAcceptanceDesk.readerExpectationSync?.missedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补期待：期待欠账 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).not.toContain('补追读：漏追读 2')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).not.toContain('补回报：回报欠账 2')
  })

  test('missed previous chapter handoff is summarized as an opening repair risk', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        readerExpectationSyncReview({
          payload: {
            reader_expectation_sync: {
              status: 'warn',
              score: 62,
              label: '期待欠账 1',
              missed_count: 1,
              planned: [{ key: 'opening_handoff', label: '上一章承接', text: '王府内钟声先乱' }],
              delivered: [],
              missed: [
                {
                  key: 'opening_handoff',
                  label: '上一章承接',
                  text: '上一章最后一幕：王府内钟声先乱',
                  match_scope: 'opening',
                },
              ],
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.readerExpectationSync?.label).toBe('开篇承接漏写 1')
    expect(model.chapterAcceptanceDesk.readerExpectationSync?.missedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.readerExpectationSync?.openingHandoffMissedCount).toBe(1)
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('修开篇承接：开篇承接漏写 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修开篇')
  })

  test('chapter benchmark sync is summarized and prioritized as a soft repair risk', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        chapterBenchmarkSyncReview(),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.chapterBenchmarkSync?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.chapterBenchmarkSync?.label).toBe('基准缺口 2')
    expect(model.chapterAcceptanceDesk.chapterBenchmarkSync?.scoreLabel).toBe('质量基准 67')
    expect(model.chapterAcceptanceDesk.chapterBenchmarkSync?.missedCount).toBe(2)
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补基准：基准缺口 2')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
  })

})
