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

describe('buildWritingCockpitModel acceptance', () => {
  test('surfaces story loop misses as repairable delivery work', () => {
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
                story_loop_checks: [
                  {
                    key: 'setup_payoff_loop',
                    label: '设问回收闭环',
                    status: 'fail',
                    evidence: '本章开头抛出谁换了封条，但结尾没有推进答案、代价或新问题。',
                    fix: '至少推进一个答案碎片，并把新问题挂到下一章钩子。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.storyLoop?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.storyLoop?.label).toBe('故事闭环缺口 1')
    expect(model.chapterAcceptanceDesk.storyLoop?.evidence.join('｜')).toContain('没有推进答案')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补故事闭环：故事闭环缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补闭环')
  })

  test('surfaces emotional arc misses as repairable delivery work', () => {
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
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.emotionalArc?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.emotionalArc?.label).toBe('情绪弧缺口 1')
    expect(model.chapterAcceptanceDesk.emotionalArc?.evidence.join('｜')).toContain('爽感释放')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补情绪弧：情绪弧缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补情绪弧')
  })

  test('surfaces chapter hook misses as repairable delivery work', () => {
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
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.chapterHook?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.chapterHook?.label).toBe('章级钩子缺口 1')
    expect(model.chapterAcceptanceDesk.chapterHook?.evidence.join('｜')).toContain('具体翻页问题')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补章级钩子：章级钩子缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补章钩')
  })

  test('surfaces paragraph hook misses as repairable delivery work', () => {
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
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.paragraphHook?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.paragraphHook?.label).toBe('段落级钩子缺口 1')
    expect(model.chapterAcceptanceDesk.paragraphHook?.evidence.join('｜')).toContain('连续六段')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补段落钩子：段落级钩子缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补段钩')
  })

  test('surfaces suspense misses as repairable delivery work', () => {
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
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.suspense?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.suspense?.label).toBe('悬念编排缺口 1')
    expect(model.chapterAcceptanceDesk.suspense?.evidence.join('｜')).toContain('可信误导')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补悬念编排：悬念编排缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补悬念')
  })

  test('surfaces asset linkage misses as repairable delivery work', () => {
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
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.assetLinkage?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.assetLinkage?.label).toBe('资产挂钩缺口 1')
    expect(model.chapterAcceptanceDesk.assetLinkage?.evidence.join('｜')).toContain('旧钥匙')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('挂资产：资产挂钩缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补资产挂钩')
  })

  test('surfaces asset linkage sync misses as repairable delivery work', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        {
          id: 911,
          chapter_id: chapters[0].id,
          review_type: 'asset_linkage_sync',
          status: 'warn',
          created_at: '2026-06-10T09:00:00.000Z',
          payload: JSON.stringify({
            chapter_id: chapters[0].id,
            chapter_no: chapters[0].chapter_no,
            asset_linkage_sync: {
              status: 'warn',
              label: '资产挂钩缺口 2',
              missed_count: 2,
              missed: [
                { label: '孤立资产', text: '旧钥匙只被点名，没有推进目标或制造阻碍。' },
                { label: '关系图风险', text: '禁门规则仍没有明确触发者和代价。' },
              ],
              next_actions: [
                '下一章必须先处理关系图风险：孤立资产要接核心关系，缺拥有者资产要明确归属、触发者、限制和代价。',
              ],
            },
          }),
        },
      ],
    })

    expect(model.chapterAcceptanceDesk.assetLinkage?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.assetLinkage?.label).toBe('资产挂钩缺口 2')
    expect(model.chapterAcceptanceDesk.assetLinkage?.missedCount).toBe(2)
    expect(model.chapterAcceptanceDesk.assetLinkage?.evidence.join('｜')).toContain('旧钥匙只被点名')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('挂资产：资产挂钩缺口 2')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补资产挂钩')
  })

  test('surfaces dialogue misses as repairable delivery work', () => {
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
                dialogue_checks: [
                  {
                    key: 'subtext_agenda',
                    label: '潜台词与议程',
                    status: 'fail',
                    evidence: '周薄森直接解释真实目的，整段对白像说明书，没有权力博弈或信息差。',
                    fix: '把真实目的改成借口、试探、回避和动作反应。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.dialogue?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.dialogue?.label).toBe('对白质量缺口 1')
    expect(model.chapterAcceptanceDesk.dialogue?.evidence.join('｜')).toContain('说明书')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('修对白：对白质量缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修对白')
  })

  test('surfaces plot dynamics misses as repairable delivery work', () => {
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
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.plotDynamics?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.plotDynamics?.label).toBe('剧情动力缺口 1')
    expect(model.chapterAcceptanceDesk.plotDynamics?.evidence.join('｜')).toContain('红色阀门')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补动力：剧情动力缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补剧情动力')
  })

  test('surfaces character relation misses as repairable delivery work', () => {
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
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.characterRelation?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.characterRelation?.label).toBe('角色关系缺口 1')
    expect(model.chapterAcceptanceDesk.characterRelation?.evidence.join('｜')).toContain('帮林栖雨')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('修关系：角色关系缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修角色关系')
  })

  test('surfaces character behavior misses as repairable delivery work', () => {
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
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.characterBehavior?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.characterBehavior?.label).toBe('角色行为缺口 1')
    expect(model.chapterAcceptanceDesk.characterBehavior?.evidence.join('｜')).toContain('只是想变强')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('修行为：角色行为缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修角色行为')
  })

  test('surfaces conflict structure misses as repairable delivery work', () => {
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
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.conflictStructure?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.conflictStructure?.label).toBe('冲突结构缺口 1')
    expect(model.chapterAcceptanceDesk.conflictStructure?.evidence.join('｜')).toContain('随时离开账房')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('加冲突：冲突结构缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修冲突结构')
  })

  test('surfaces opening misses as repairable delivery work', () => {
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
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.opening?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.opening?.label).toBe('开篇设计缺口 1')
    expect(model.chapterAcceptanceDesk.opening?.evidence.join('｜')).toContain('主角第900字')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('改开篇：开篇设计缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修开篇')
  })

  test('surfaces bridge unit misses as repairable delivery work', () => {
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
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.bridgeUnit?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.bridgeUnit?.label).toBe('桥段节奏缺口 1')
    expect(model.chapterAcceptanceDesk.bridgeUnit?.evidence.join('｜')).toContain('章尾没有新目标')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补桥段：桥段节奏缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补桥段节奏')
  })

  test('surfaces reversal misses as repairable delivery work', () => {
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
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.reversal?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.reversal?.label).toBe('反转设计缺口 1')
    expect(model.chapterAcceptanceDesk.reversal?.evidence.join('｜')).toContain('没有3处公平暗示')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补反转：反转设计缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补反转设计')
  })

  test('surfaces showdown misses as repairable delivery work', () => {
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
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.showdown?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.showdown?.label).toBe('高潮对抗缺口 1')
    expect(model.chapterAcceptanceDesk.showdown?.evidence.join('｜')).toContain('没有受到对应压制')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补高潮：高潮对抗缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先补高潮对抗')
  })

  test('surfaces prose craft misses as repairable delivery work', () => {
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
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.proseCraft?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.proseCraft?.label).toBe('正文工艺缺口 1')
    expect(model.chapterAcceptanceDesk.proseCraft?.evidence.join('｜')).toContain('没有主角深度限知')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('修工艺：正文工艺缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修正文工艺')
  })

  test('surfaces scene-card execution directive misses as priority delivery work', () => {
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
                prose_craft_checks: [
                  {
                    key: 'scene_card_1_forbidden_directives',
                    label: '场景卡禁令执行',
                    status: 'fail',
                    evidence: '场景1《蓝晶灼手》违反场景卡禁令：不得用整段来历/等级解释蓝晶；正文出现整段来历/等级解释或说明书式科普。',
                    fix: '删掉说明书式来历、原理和等级解释，改成角色当下动作反应、对话半句、物理后果或证据判断变化。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.proseCraft?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('修场景卡：场景卡执行缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修场景卡')
  })

  test('surfaces punctuation tone misses as repairable delivery work', () => {
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
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.punctuationTone?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.punctuationTone?.label).toBe('语气标点缺口 1')
    expect(model.chapterAcceptanceDesk.punctuationTone?.evidence.join('｜')).toContain('爆发句乱用三个感叹号')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('调语气：语气标点缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修语气标点')
  })

  test('surfaces content rubric misses as repairable delivery work', () => {
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
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.contentRubric?.status).toBe('warn')
    expect(model.chapterAcceptanceDesk.contentRubric?.label).toBe('内容基准缺口 1')
    expect(model.chapterAcceptanceDesk.contentRubric?.evidence.join('｜')).toContain('为什么翻下一页')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补内容：内容基准缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修内容基准')
  })

  test('prioritizes creation contract risks before ordinary delivery risks', () => {
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
                content_rubric_checks: [
                  {
                    key: 'golden_three_questions',
                    label: '黄金三问',
                    status: 'fail',
                    evidence: '旧印亮出后局势没有可见变化。',
                    fix: '补旧印改变审判资格的正文证据。',
                  },
                ],
                target_reader_checks: [
                  {
                    key: 'emotion_gap_missing',
                    label: '情绪缺口',
                    status: 'fail',
                    evidence: '目标读者核心痛苦没有转成尊严补偿。',
                    fix: '把被轻视的压力写成当众反证资格。',
                  },
                ],
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items[0]).toBe('创作契约：目标读者缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.items).toContain('补内容：内容基准缺口 1')
    expect(model.chapterAcceptanceDesk.deliveryRiskQueue?.priorityLabel).toBe('优先修创作契约')
  })

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
