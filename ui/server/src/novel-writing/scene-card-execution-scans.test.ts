import { describe, expect, test } from 'bun:test'
import {
  buildSceneCardConsumptionChecks,
  buildSceneCardReceiptSyncReport,
  buildStoryStateSyncContextPackage,
  scanSceneCardReceiptRisks,
  scanSceneSensoryAnchorRisks,
  scanSceneSerialRiskRepairRisks,
  selectVerifiedSceneBreakdownUpdate,
  verifiedSceneBreakdownForStateSync,
} from './scene-card-execution-scans'

describe('scene-card execution scan utilities', () => {
  test('detects scene cards whose planned beats are not consumed by the final prose', () => {
    const checks = buildSceneCardConsumptionChecks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '玻璃门前',
            purpose: '李辰确认门外学生是否违反校规。',
            conflict: '开门会违反规则，不开门会失去线索。',
            reader_payoff: '规则边界压迫主角做选择。',
          },
          {
            scene_no: 2,
            title: '校徽露出',
            purpose: '学生袖口露出上一轮玩家的校徽。',
            conflict: '李辰必须判断这枚校徽是不是陷阱。',
            reader_payoff: '上一轮玩家线索打开新悬念。',
          },
        ],
      },
    }, '玻璃门外，学生敲了三下。李辰没有立刻开门，他盯着校规里那句禁止接触门外人的红字。')

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_2_consumption')
    expect(checks[0].evidence).toContain('校徽露出')
    expect(checks[0].fix).toContain('场景卡')
  })

  test('detects scene-card oh-story execution directives missing from final prose', () => {
    const checks = buildSceneCardConsumptionChecks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '蓝晶灼手',
            purpose: '蓝晶首次进入正文并改变证据判断。',
            conflict: '执事抢夺蓝晶，主角必须立刻判断它能不能读证据。',
            reader_payoff: '蓝晶改变证据判断。',
            concept_anchor_rules: ['蓝晶首次出现必须先写灼手反应和物理后果。'],
          },
        ],
      },
    }, [
      '蓝晶灼手这一幕里，执事抢夺蓝晶，主角立刻判断它能不能读证据。',
      '蓝晶改变了证据判断。',
      '蓝晶是旧王朝留下来的记忆器，源于三百年前的祭司制度，分为七阶九品。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_1_execution_directives')
    expect(checks[0].evidence).toContain('灼手反应')
    expect(checks[0].fix).toContain('动作反应')
  })

  test('detects scene-card sensory anchors missing from final prose', () => {
    const checks = scanSceneSensoryAnchorRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '账本翻页',
            purpose: '江辰翻到账本缺页，确认执事篡改账册。',
            sensory_anchor: '纸张触感粗糙，页角卷曲处有新墨洇开的痕迹',
            required_beats: ['翻到账本缺页', '确认篡改账册'],
          },
        ],
      },
    }, [
      '第12章 旧账册',
      '',
      '江辰翻到账本缺页，确认执事篡改账册。',
      '',
      '他抬头看向审判台，把账册递给旁证，示意对方验印。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_sensory_anchor_1_missing')
    expect(checks[0].evidence).toContain('纸张触感粗糙')
    expect(checks[0].fix).toContain('主角主动注意')
  })

  test('does not flag scene-card sensory anchors when the sensory detail lands in prose', () => {
    const checks = scanSceneSensoryAnchorRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '账本翻页',
            purpose: '江辰翻到账本缺页，确认执事篡改账册。',
            sensory_anchor: '纸张触感粗糙，页角卷曲处有新墨洇开的痕迹',
            required_beats: ['翻到账本缺页', '确认篡改账册'],
          },
        ],
      },
    }, [
      '第12章 旧账册',
      '',
      '江辰翻到账本缺页，指腹蹭过纸张粗糙的断边，页角卷曲处还压着一圈新墨洇开的痕迹。',
      '',
      '他没有急着抬头，只把那一页推到旁证面前：“昨夜换过。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('detects scene-card serial risk repair actions missing from final prose', () => {
    const checks = scanSceneSerialRiskRepairRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '旧盟约重签',
            purpose: '江辰用账册证据逼盟友改口。',
            required_beats: ['账册证据亮相', '盟友改口'],
            serial_risk_repairs: ['two_chapter_momentum_stall', 'five_chapter_texture_gap'],
            recent_fatigue_action: '用账册新证据推进目标，同时让盟友关系发生可见变化。',
          },
        ],
      },
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册证据亮在桌上，盟友终于改口。',
      '',
      '众人沉默片刻，他收起账册，转身离开。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_serial_risk_repair_1_missing')
    expect(checks[0].evidence).toContain('two_chapter_momentum_stall')
    expect(checks[0].fix).toContain('目标推进')
  })

  test('does not flag scene-card serial risk repair actions when the repair lands in prose', () => {
    const checks = scanSceneSerialRiskRepairRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '旧盟约重签',
            purpose: '江辰用账册证据逼盟友改口。',
            required_beats: ['账册证据亮相', '盟友改口'],
            serial_risk_repairs: ['two_chapter_momentum_stall', 'five_chapter_texture_gap'],
            recent_fatigue_action: '用账册新证据推进目标，同时让盟友关系发生可见变化。',
          },
        ],
      },
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册新证据亮在桌上，先指出盟约漏洞，再把下一步目标推到禁库钥匙上。',
      '',
      '原本沉默的盟友终于改口，主动站到他身侧，递出自己的旧印：“这次我跟你走。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('detects scene-card receipts whose evidence is missing from final prose', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '旧盟约重签',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            density_level_delivered: true,
            sensory_anchor_delivered: true,
            serial_risk_repairs_delivered: true,
            evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
          },
        },
      ],
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册证据亮在桌上，盟友终于改口。',
      '',
      '众人沉默片刻，他收起账册，转身离开。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_receipt_1_evidence_missing')
    expect(checks[0].status).toBe('fail')
    expect(checks[0].fix).toContain('不能信任回执自述')
  })

  test('flags scene-card receipt evidence that appears outside the matching scene text', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '账册亮相',
          scene_text: '江辰把账册新证据亮在桌上，先指出盟约漏洞。',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
          },
        },
        {
          scene_no: 2,
          title: '盟友改口',
          scene_text: '原本沉默的盟友主动站到江辰身侧，递出自己的旧印：“这次我跟你走。”',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
          },
        },
      ],
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册新证据亮在桌上，先指出盟约漏洞。',
      '',
      '原本沉默的盟友主动站到江辰身侧，递出自己的旧印：“这次我跟你走。”',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_card_receipt_1_evidence_out_of_scene')
    expect(checks[0].evidence).toContain('不在对应场景文本中')
  })

  test('accepts stale scene anchors when final prose contains receipt evidence in scene order', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '账册亮相',
          scene_start_anchor: '旧稿里不存在的场景一开头',
          scene_end_anchor: '旧稿里不存在的场景一结尾',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            evidence: ['江辰把账册新证据亮在桌上'],
          },
        },
        {
          scene_no: 2,
          title: '盟友改口',
          scene_start_anchor: '旧稿里不存在的场景二开头',
          scene_end_anchor: '旧稿里不存在的场景二结尾',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
          },
        },
      ],
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册新证据亮在桌上，先指出盟约漏洞。',
      '',
      '原本沉默的盟友主动站到江辰身侧，递出自己的旧印：“这次我跟你走。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('accepts all-stale scene anchors when receipt evidence fuzzily matches final prose', () => {
    const checks = scanSceneCardReceiptRisks({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '账册亮相',
          scene_start_anchor: '旧稿场景一开头',
          scene_end_anchor: '旧稿场景一结尾',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            evidence: ['账册被推上桌，盟约漏洞暴露'],
          },
        },
        {
          scene_no: 2,
          title: '盟友改口',
          scene_start_anchor: '旧稿场景二开头',
          scene_end_anchor: '旧稿场景二结尾',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            purpose_tag_delivered: true,
            evidence: ['盟友改口，交出旧印'],
          },
        },
      ],
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册新证据亮在桌上，先指出盟约漏洞。',
      '',
      '原本沉默的盟友终于改口，主动站到江辰身侧，递出自己的旧印：“这次我跟你走。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('builds a scene-card receipt sync report from deterministic receipt risks', () => {
    const report = buildSceneCardReceiptSyncReport(
      { title: '旧盟约' },
      { id: 12, chapter_no: 12, title: '旧盟约' },
      {
        generated_scene_breakdown: [
          {
            scene_no: 1,
            title: '旧盟约重签',
            scene_card_receipts: {
              goal_obstacle_change_delivered: true,
              purpose_tag_delivered: true,
              evidence: ['盟友主动站到江辰身侧，递出自己的旧印'],
            },
          },
        ],
      },
      '江辰把账册证据亮在桌上，盟友终于改口。',
    )

    expect(report.status).toBe('warn')
    expect(report.label).toBe('场景回执缺口 1')
    expect(report.missed_count).toBe(1)
    expect(report.next_actions.join('｜')).toContain('scene_card_receipts')
  })

  test('keeps only verified scene-card receipts for story state sync', () => {
    const verified = verifiedSceneBreakdownForStateSync({
      generated_scene_breakdown: [
        {
          scene_no: 1,
          title: '账册亮相',
          scene_start_anchor: '江辰把账册新证据亮在桌上',
          scene_end_anchor: '先指出盟约漏洞',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            evidence: ['江辰把账册新证据亮在桌上'],
          },
        },
        {
          scene_no: 2,
          title: '污染回执',
          scene_start_anchor: '原本沉默的盟友主动站到江辰身侧',
          scene_end_anchor: '这次我跟你走',
          scene_card_receipts: {
            goal_obstacle_change_delivered: true,
            evidence: ['正文不存在的旧印归属变化'],
          },
        },
      ],
    }, [
      '第12章 旧盟约',
      '',
      '江辰把账册新证据亮在桌上，先指出盟约漏洞。',
      '',
      '原本沉默的盟友主动站到江辰身侧：“这次我跟你走。”',
    ].join('\n'))

    expect(verified).toHaveLength(1)
    expect(verified[0].title).toBe('账册亮相')
  })

  test('removes unverified camelCase scene-card receipts from story state sync context', () => {
    const context = buildStoryStateSyncContextPackage({
      chapterTarget: {
        title: '旧盟约',
        generatedSceneBreakdown: [
          {
            sceneNo: 1,
            title: '污染回执',
            sceneStartAnchor: '原本沉默的盟友主动站到江辰身侧',
            sceneEndAnchor: '这次我跟你走',
            sceneCardReceipts: {
              goalObstacleChangeDelivered: true,
              evidence: ['正文不存在的旧印归属变化'],
            },
          },
        ],
      },
    }, '原本沉默的盟友主动站到江辰身侧：“这次我跟你走。”')

    expect(context.generated_scene_breakdown).toHaveLength(0)
    expect(context.chapterTarget.generatedSceneBreakdown).toHaveLength(0)
    expect(JSON.stringify(context)).not.toContain('正文不存在的旧印归属变化')
  })

  test('keeps the previous scene breakdown when a candidate update has invalid receipts', () => {
    const previousBreakdown = [
      {
        scene_no: 1,
        title: '可信回执',
        scene_card_receipts: {
          goal_obstacle_change_delivered: true,
          evidence: ['江辰把账册新证据亮在桌上'],
        },
      },
    ]
    const candidateBreakdown = [
      {
        scene_no: 1,
        title: '污染回执',
        scene_card_receipts: {
          goal_obstacle_change_delivered: true,
          evidence: ['盟友递出不存在的旧印'],
        },
      },
    ]

    const selected = selectVerifiedSceneBreakdownUpdate(
      previousBreakdown,
      candidateBreakdown,
      '江辰把账册新证据亮在桌上，先指出盟约漏洞。',
    )

    expect(selected).toBe(previousBreakdown)
  })
})
