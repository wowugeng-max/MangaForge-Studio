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

describe('buildWritingCockpitModel acceptance a', () => {
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


})
