import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import {
  buildDeliveryRiskRevisionClosurePlan,
  buildRepairTaskRevisionPrompt,
  listQualityContractRequiredFields,
  listQualityContractRequiredFieldKeys,
} from './repairTaskRevisionPrompt'

describe('buildRepairTaskRevisionPrompt specialty/audience', () => {
  test('keeps innovation repair tasks open until innovation checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'innovation_missed',
        annotation_category: 'innovation',
        annotation_key: 'prose_quality:202:12:12:innovation_missed:创新执行',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            innovation_checks: [
              {
                key: 'retellable_hook',
                label: '可复述创新点',
                status: 'warn',
                evidence: '新设定仍只是换名词，缺少差异化机制和可视化场面。',
                fix: '把黑钥匙规则写成可复述的现场机制。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('创新执行仍未闭环')
    expect(residual.note).toContain('可复述创新点')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'innovation_missed',
        annotation_category: 'innovation',
        annotation_key: 'prose_quality:202:12:12:innovation_missed:创新执行',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            innovation_checks: [
              {
                key: 'retellable_hook',
                label: '可复述创新点',
                status: 'pass',
                evidence: '修订稿把黑钥匙规则写成越接近真门越会暴露旧伤的可视化机制。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('innovation_type')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'innovation_missed',
        annotation_category: 'innovation',
        annotation_key: 'prose_quality:202:12:12:innovation_missed:创新执行',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            innovation_checks: [
              {
                key: 'retellable_hook',
                label: '可复述创新点',
                status: 'pass',
                innovation_type: '规则机制创新',
                differentiating_mechanism: '黑钥匙越接近真门越会暴露持有者旧伤',
                visualized_scene: '钥匙贴近禁门时，主角手背旧伤亮出同色裂纹',
                reader_retellable_hook: '开门不是万能钥匙，而是会反向暴露持有者的钥匙',
                long_term_fit: '后续每次用钥匙都伴随身份暴露风险',
                evidence: '修订稿把黑钥匙规则写成越接近真门越会暴露旧伤的可视化机制。',
                fix: '补创新类型、差异化机制、可视化场面、可复述钩子和长期适配。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('创新执行复检通过')
    expect(cleared.note).toContain('innovation_checks')
  })

  test('keeps chapter attraction repair tasks open until chapter attraction checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'chapter_attraction_gap',
        annotation_category: 'chapter_attraction',
        annotation_key: 'prose_quality:202:12:12:chapter_attraction_gap:章节吸引力',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            chapter_attraction_checks: [
              {
                key: 'attraction_stack',
                label: '吸引力组合',
                status: 'warn',
                evidence: '开篇、场景推进、爽点密度和章末翻页仍都偏弱。',
                fix: '同时补开篇钩子、目标阻碍转折回报和章尾翻页。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('章节吸引力仍未闭环')
    expect(residual.note).toContain('吸引力组合')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'chapter_attraction_gap',
        annotation_category: 'chapter_attraction',
        annotation_key: 'prose_quality:202:12:12:chapter_attraction_gap:章节吸引力',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            chapter_attraction_checks: [
              {
                key: 'attraction_stack',
                label: '吸引力组合',
                status: 'pass',
                evidence: '修订稿把开篇钩子、目标阻碍转折回报和章尾翻页都落成现场事件。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('attraction_dimension')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'chapter_attraction_gap',
        annotation_category: 'chapter_attraction',
        annotation_key: 'prose_quality:202:12:12:chapter_attraction_gap:章节吸引力',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            chapter_attraction_checks: [
              {
                key: 'attraction_stack',
                label: '吸引力组合',
                status: 'pass',
                attraction_dimension: 'opening_hook/conflict_progression/payoff/ending_page_turn',
                opening_hook: '首段让主角在验阵台被公开夺资格',
                scene_goal_obstacle_turn_reward: '目标是保资格，阻碍是执事封门，转折是旧印反证，回报是审判权转移',
                payoff_density: '旧印、黑钥匙、账本编号三处回报集中兑现',
                ending_page_turn: '章尾抛出赤炉城供奉与旧钥匙同纹',
                spreadable_scene: '旧印贴门，手背旧伤亮出同色裂纹',
                evidence: '修订稿把开篇钩子、目标阻碍转折回报和章尾翻页都落成现场事件。',
                fix: '补开篇钩子、场景推进、爽点密度、章末翻页和可传播场面。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('章节吸引力复检通过')
    expect(cleared.note).toContain('chapter_attraction_checks')
  })

  test('keeps story drive repair tasks open until story drive checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'story_drive_gap',
        annotation_category: 'story_drive',
        annotation_key: 'prose_quality:202:12:12:story_drive_gap:故事驱动力',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            story_drive_checks: [
              {
                key: 'choice_cost_causality',
                label: '选择代价因果',
                status: 'warn',
                evidence: '主角仍被剧情推着走，缺主动选择、代价和下一步因果。',
                fix: '让主角主动押上名额换线索，并承接到下一章追查。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('故事驱动力仍未闭环')
    expect(residual.note).toContain('选择代价因果')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'story_drive_gap',
        annotation_category: 'story_drive',
        annotation_key: 'prose_quality:202:12:12:story_drive_gap:故事驱动力',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            story_drive_checks: [
              {
                key: 'choice_cost_causality',
                label: '选择代价因果',
                status: 'pass',
                evidence: '修订稿让主角主动押上名额换线索，并把代价接到下一章追查。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('protagonist_choice')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'story_drive_gap',
        annotation_category: 'story_drive',
        annotation_key: 'prose_quality:202:12:12:story_drive_gap:故事驱动力',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            story_drive_checks: [
              {
                key: 'choice_cost_causality',
                label: '选择代价因果',
                status: 'pass',
                protagonist_choice: '主动押上阵盘名额换取账本线索',
                obstacle: '执事封门并威胁资格作废',
                cost: '若查错会失去内门资格',
                state_change: '主角从被审者转为临时追查者',
                next_causality: '下一章必须追查赤炉城供奉为何同纹',
                evidence: '修订稿让主角主动押上名额换线索，并把代价接到下一章追查。',
                fix: '补主动选择、阻碍、代价、状态变化和下一步因果。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('故事驱动力复检通过')
    expect(cleared.note).toContain('story_drive_checks')
  })

  test('keeps character arc repair tasks open until character arc checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'character_arc_gap',
        annotation_category: 'character_arc',
        annotation_key: 'prose_quality:202:12:12:character_arc_gap:人物弧光',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            character_arc_checks: [
              {
                key: 'growth_beat',
                label: '成长节点',
                status: 'warn',
                evidence: '主角只在心理旁白里说要变强，没有欲望、缺陷受压和关系反馈。',
                fix: '把成长落到选择、代价和关系反馈上。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('人物弧光仍未闭环')
    expect(residual.note).toContain('成长节点')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'character_arc_gap',
        annotation_category: 'character_arc',
        annotation_key: 'prose_quality:202:12:12:character_arc_gap:人物弧光',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            character_arc_checks: [
              {
                key: 'growth_beat',
                label: '成长节点',
                status: 'pass',
                evidence: '修订稿把主角成长落到当场押上名额、承受误判代价和林栖雨关系变化。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('character')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'character_arc_gap',
        annotation_category: 'character_arc',
        annotation_key: 'prose_quality:202:12:12:character_arc_gap:人物弧光',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            character_arc_checks: [
              {
                key: 'growth_beat',
                label: '成长节点',
                status: 'pass',
                character: '主角',
                desire: '保住阵盘资格并查明母亲旧约',
                flaw_pressure: '过去只躲避宗门审判，这次被迫公开下注',
                relationship_change: '林栖雨从利用线索转为承认共同风险',
                growth_beat: '主角当场押上名额主动追查',
                voice_anchor: '克制短句，不再用心理旁白替代选择',
                evidence: '修订稿把主角成长落到当场押上名额、承受误判代价和林栖雨关系变化。',
                fix: '补欲望、缺陷受压、关系变化、成长节点和口吻锚点。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('人物弧光复检通过')
    expect(cleared.note).toContain('character_arc_checks')
  })

  test('keeps chapter benchmark repair tasks open until chapter benchmark checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'chapter_benchmark_gap',
        annotation_category: 'chapter_benchmark',
        annotation_key: 'prose_quality:202:12:12:chapter_benchmark_gap:章节标杆',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            chapter_benchmark_checks: [
              {
                key: 'benchmark_application',
                label: '标杆方法落地',
                status: 'warn',
                evidence: '只说参考了标杆章，正文没有可见的开篇钩子、节拍和章末追读。',
                fix: '把标杆方法改写成本章自己的节拍证据。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('章节标杆仍未闭环')
    expect(residual.note).toContain('标杆方法落地')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'chapter_benchmark_gap',
        annotation_category: 'chapter_benchmark',
        annotation_key: 'prose_quality:202:12:12:chapter_benchmark_gap:章节标杆',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            chapter_benchmark_checks: [
              {
                key: 'benchmark_application',
                label: '标杆方法落地',
                status: 'pass',
                evidence: '修订稿把标杆的先压迫后反制节拍改写成本章验阵台场景，没有复制桥段。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('benchmark_dimension')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'chapter_benchmark_gap',
        annotation_category: 'chapter_benchmark',
        annotation_key: 'prose_quality:202:12:12:chapter_benchmark_gap:章节标杆',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            chapter_benchmark_checks: [
              {
                key: 'benchmark_application',
                label: '标杆方法落地',
                status: 'pass',
                benchmark_dimension: 'scene_rhythm',
                expected_method: '先压迫、再反证、后释放追读',
                delivered_evidence: '验阵台公开夺资格，旧印反证后转入赤炉城供奉钩子',
                originality_guard: '没有复制标杆桥段、专名、原句或核心梗',
                evidence: '修订稿把标杆的先压迫后反制节拍改写成本章验阵台场景，没有复制桥段。',
                fix: '补标杆维度、方法、交付证据和原创性保护。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('章节标杆复检通过')
    expect(cleared.note).toContain('chapter_benchmark_checks')
  })

  test('keeps style sample repair tasks open until style sample checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'style_sample_gap',
        annotation_category: 'style_sample',
        annotation_key: 'prose_quality:202:12:12:style_sample_gap:样章风格',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            style_sample_checks: [
              {
                key: 'voice_adaptation',
                label: '样章方法改写',
                status: 'warn',
                evidence: '正文仍照搬样章句式和停顿，没有改成本书角色口吻。',
                fix: '只保留节奏方法，改写成本章动作链和声线。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('样章风格仍未闭环')
    expect(residual.note).toContain('样章方法改写')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'style_sample_gap',
        annotation_category: 'style_sample',
        annotation_key: 'prose_quality:202:12:12:style_sample_gap:样章风格',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            style_sample_checks: [
              {
                key: 'voice_adaptation',
                label: '样章方法改写',
                status: 'pass',
                evidence: '修订稿只保留短促压迫节奏，改成本章验印动作链和主角克制声线。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('style_dimension')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'style_sample_gap',
        annotation_category: 'style_sample',
        annotation_key: 'prose_quality:202:12:12:style_sample_gap:样章风格',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            style_sample_checks: [
              {
                key: 'voice_adaptation',
                label: '样章方法改写',
                status: 'pass',
                style_dimension: 'voice',
                source_technique: '短促压迫节奏和动作承接情绪',
                adapted_evidence: '验印动作链承接主角克制短句和执事冷硬质问',
                copied_phrase_rewritten: '已重写样章相近句式，没有保留原句',
                evidence: '修订稿只保留短促压迫节奏，改成本章验印动作链和主角克制声线。',
                fix: '补风格维度、来源技法、改写证据和照搬句重写。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('样章风格复检通过')
    expect(cleared.note).toContain('style_sample_checks')

    const nestedReceiptCleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'style_sample_gap',
        annotation_category: 'style_sample',
        annotation_key: 'prose_quality:202:12:12:style_sample_gap:样章风格',
      },
      {
        quality_refresh: {
          ok: true,
          score: 90,
          review: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                style_sample_checks: [
                  {
                    key: 'voice_adaptation',
                    label: '样章方法改写',
                    delivered: true,
                    status: 'pass',
                    style_dimension: 'voice',
                    source_technique: '短促压迫节奏和动作承接情绪',
                    adapted_evidence: '验印动作链承接主角克制短句和执事冷硬质问',
                    copied_phrase_rewritten: '已重写样章相近句式，没有保留原句',
                    evidence: '修订稿只保留短促压迫节奏，改成本章验印动作链和主角克制声线。',
                    fix: '补风格维度、来源技法、改写证据和照搬句重写。',
                    remaining_risk: '',
                  },
                ],
              },
            },
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(nestedReceiptCleared.taskStatus).toBe('resolved')
    expect(nestedReceiptCleared.annotationStatus).toBe('resolved')
    expect(nestedReceiptCleared.note).toContain('style_sample_checks')
  })

  test('keeps content rubric repair tasks open until content rubric checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'content_rubric_gap',
        annotation_category: 'content_rubric',
        annotation_key: 'prose_quality:202:12:12:content_rubric_gap:内容基准',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            content_rubric_checks: [
              {
                key: 'golden_three_questions',
                label: '黄金三问',
                status: 'warn',
                evidence: '本章仍没有回答读者为什么翻下一页，旧印亮出后局势没有可见变化。',
                fix: '补局势变化和章末新期待。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('内容基准仍未闭环')
    expect(residual.note).toContain('黄金三问')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'content_rubric_gap',
        annotation_category: 'content_rubric',
        annotation_key: 'prose_quality:202:12:12:content_rubric_gap:内容基准',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            content_rubric_checks: [
              {
                key: 'golden_three_questions',
                label: '黄金三问',
                status: 'pass',
                evidence: '修订稿让旧印改变审判资格，长老席追查内库阵图形成新期待。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('内容基准仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('core_selling_point')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'content_rubric_gap',
        annotation_category: 'content_rubric',
        annotation_key: 'prose_quality:202:12:12:content_rubric_gap:内容基准',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            content_rubric_checks: [
              {
                key: 'golden_three_questions',
                label: '黄金三问',
                status: 'pass',
                core_selling_point: '旧印改变审判资格，让主角用规则反压权力。',
                conflict_progression: '长老席由压迫转为追查内库阵图。',
                chapter_change: '审判资格和敌方目标发生可见变化。',
                page_turn_reason: '内库阵图的来源和追查对象成为下一章问题。',
                evidence: '修订稿让旧印改变审判资格，长老席追查内库阵图形成新期待，并用动作对白证明变化。',
                fix: '补核心卖点、冲突推进、章节变化和翻页理由。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('内容基准复检通过')
    expect(cleared.note).toContain('content_rubric_checks')
  })

  test('keeps reader retention repair tasks open until reader retention checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'reader_retention_gap',
        annotation_category: 'reader_retention',
        annotation_key: 'prose_quality:202:12:12:reader_retention_gap:追读雷达',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            reader_retention_checks: [
              {
                key: 'double_engine_hunger_missing',
                label: '留存双引擎',
                status: 'warn',
                evidence: '本章仍没有信息差植入问号，章尾没有追读饥饿。',
                fix: '补信息差和章尾新问题。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('追读雷达仍未闭环')
    expect(residual.note).toContain('留存双引擎')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'reader_retention_gap',
        annotation_category: 'reader_retention',
        annotation_key: 'prose_quality:202:12:12:reader_retention_gap:追读雷达',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            reader_retention_checks: [
              {
                key: 'double_engine_hunger_missing',
                label: '留存双引擎',
                status: 'pass',
                evidence: '修订稿把旧印来源卡到章尾，只露出内库阵图半枚残印。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('追读雷达仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('retention_engine')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'reader_retention_gap',
        annotation_category: 'reader_retention',
        annotation_key: 'prose_quality:202:12:12:reader_retention_gap:追读雷达',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            reader_retention_checks: [
              {
                key: 'double_engine_hunger_missing',
                label: '留存双引擎',
                status: 'pass',
                retention_engine: '情绪回报 + 信息饥饿',
                emotional_payoff: '主角用旧印反压长老席，读者获得局势反转回报。',
                information_hunger: '旧印只露出内库阵图半枚残印，留下来源疑问。',
                page_turn_question: '长老席追查内库阵图会牵出谁。',
                evidence: '修订稿把旧印来源卡到章尾，只露出内库阵图半枚残印，并给长老席追查的新问题和随机额外收获。',
                fix: '补情绪回报、信息差和章末新问题。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('追读雷达复检通过')
    expect(cleared.note).toContain('reader_retention_checks')
  })

  test('keeps target reader repair tasks open until target reader checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'target_reader_gap',
        annotation_category: 'target_reader',
        annotation_key: 'prose_quality:202:12:12:target_reader_gap:目标读者',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            target_reader_checks: [
              {
                key: 'emotion_gap_missing',
                label: '情绪缺口',
                status: 'warn',
                evidence: '目标读者画像仍空泛，缺核心痛苦和未满足需求。',
                fix: '补目标读者痛点和可见回报。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('目标读者仍未闭环')
    expect(residual.note).toContain('情绪缺口')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'target_reader_gap',
        annotation_category: 'target_reader',
        annotation_key: 'prose_quality:202:12:12:target_reader_gap:目标读者',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            target_reader_checks: [
              {
                key: 'emotion_gap_missing',
                label: '情绪缺口',
                status: 'pass',
                evidence: '修订稿把被宗门轻视的核心痛苦写成审判现场压力。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('目标读者仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('target_reader_profile')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'target_reader_gap',
        annotation_category: 'target_reader',
        annotation_key: 'prose_quality:202:12:12:target_reader_gap:目标读者',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            target_reader_checks: [
              {
                key: 'emotion_gap_missing',
                label: '情绪缺口',
                status: 'pass',
                target_reader_profile: '喜欢废柴逆袭、规则反压和尊严回报的玄幻读者。',
                reader_desire: '看主角在公开审判中用证据反压权力。',
                emotion_gap: '被宗门轻视后的不甘和求认可。',
                chapter_hit: '旧印反证资格，现场压力转成尊严回报。',
                platform_taste: '快节奏压迫、当场反转、章尾新期待。',
                evidence: '修订稿把被宗门轻视的核心痛苦写成审判现场压力，用旧印反证资格并给读者尊严回报。',
                fix: '补目标读者画像、情绪缺口和本章可见回报。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('目标读者复检通过')
    expect(cleared.note).toContain('target_reader_checks')
  })

  test('keeps genre positioning repair tasks open until genre positioning checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'genre_positioning_gap',
        annotation_category: 'genre_positioning',
        annotation_key: 'prose_quality:202:12:12:genre_positioning_gap:题材定位',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            genre_positioning_checks: [
              {
                key: 'core_hook_blurry',
                label: '核心梗',
                status: 'warn',
                evidence: '核心梗仍不清，题材长板没有强化。',
                fix: '补阵修长板和书名简介正文一致性。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('题材定位仍未闭环')
    expect(residual.note).toContain('核心梗')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'genre_positioning_gap',
        annotation_category: 'genre_positioning',
        annotation_key: 'prose_quality:202:12:12:genre_positioning_gap:题材定位',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            genre_positioning_checks: [
              {
                key: 'core_hook_blurry',
                label: '核心梗',
                status: 'pass',
                evidence: '修订稿把旧印改成阵法资格反证。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('题材定位仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('genre_tag')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'genre_positioning_gap',
        annotation_category: 'genre_positioning',
        annotation_key: 'prose_quality:202:12:12:genre_positioning_gap:题材定位',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            genre_positioning_checks: [
              {
                key: 'core_hook_blurry',
                label: '核心梗',
                status: 'pass',
                genre_tag: '阵修逆袭玄幻',
                core_hook: '旧印反证阵法资格，用规则反压宗门审判。',
                type_formula: '被压制 -> 亮出阵修证据 -> 当场反制 -> 引出更高门槛。',
                genre_strength: '识阵、破阵、反制三处正文动作强化阵修长板。',
                book_title_blurb_alignment: '旧印、阵图和审判资格都服务书名简介里的阵修逆袭承诺。',
                evidence: '修订稿把旧印改成阵法资格反证，围绕阵修长板补出识阵、破阵、反制三处正文证据。',
                fix: '补题材标签、核心梗、类型公式和题材长板。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('题材定位复检通过')
    expect(cleared.note).toContain('genre_positioning_checks')
  })

  test('keeps female audience repair tasks open until female audience checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'female_audience_gap',
        annotation_category: 'female_audience',
        annotation_key: 'prose_quality:202:12:12:female_audience_gap:女频长篇',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            female_audience_checks: [
              {
                key: 'agency_and_security_missing',
                label: '安全感与主动性',
                status: 'warn',
                evidence: '女主仍被安排着赢，缺少安全感锚点。',
                fix: '补女主主动选择和安全感反馈。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('女频长篇仍未闭环')
    expect(residual.note).toContain('安全感与主动性')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'female_audience_gap',
        annotation_category: 'female_audience',
        annotation_key: 'prose_quality:202:12:12:female_audience_gap:女频长篇',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            female_audience_checks: [
              {
                key: 'agency_and_security_missing',
                label: '安全感与主动性',
                status: 'pass',
                evidence: '修订稿让女主主动亮出旧印并承担代价。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('女频长篇仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('security_anchor')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'female_audience_gap',
        annotation_category: 'female_audience',
        annotation_key: 'prose_quality:202:12:12:female_audience_gap:女频长篇',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            female_audience_checks: [
              {
                key: 'agency_and_security_missing',
                label: '安全感与主动性',
                status: 'pass',
                security_anchor: '盟友公开站队，确认女主不是孤身承担代价。',
                reader_identification: '女主被轻视后仍主动选择亮出旧印。',
                heroine_agency: '女主自己决定用旧印反证资格并承担后果。',
                relationship_axis: '盟友站队和长老席施压形成情感/权力双轴。',
                post_abuse_payoff: '反转后补出盟友递来的糖和公开认可。',
                evidence: '修订稿让女主主动亮出旧印并承担代价，盟友公开站队给安全感反馈，章尾补出反转后的糖。',
                fix: '补女主主动性、安全感锚点和虐后回报。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('女频长篇复检通过')
    expect(cleared.note).toContain('female_audience_checks')
  })

  test('keeps upgrade rhythm repair tasks open until upgrade rhythm checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'upgrade_rhythm_gap',
        annotation_category: 'upgrade_rhythm',
        annotation_key: 'prose_quality:202:12:12:upgrade_rhythm_gap:升级节奏',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            upgrade_rhythm_checks: [
              {
                key: 'feedback_and_threshold_missing',
                label: '升级反馈与门槛',
                status: 'warn',
                evidence: '升级后仍只有奖励，缺少即时反馈和新门槛。',
                fix: '补即时反馈、延迟反馈和新门槛。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('升级节奏仍未闭环')
    expect(residual.note).toContain('升级反馈与门槛')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'upgrade_rhythm_gap',
        annotation_category: 'upgrade_rhythm',
        annotation_key: 'prose_quality:202:12:12:upgrade_rhythm_gap:升级节奏',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            upgrade_rhythm_checks: [
              {
                key: 'feedback_and_threshold_missing',
                label: '升级反馈与门槛',
                status: 'pass',
                evidence: '修订稿补出旧印即时改变审判资格。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('升级节奏仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('before_after_contrast')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'upgrade_rhythm_gap',
        annotation_category: 'upgrade_rhythm',
        annotation_key: 'prose_quality:202:12:12:upgrade_rhythm_gap:升级节奏',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            upgrade_rhythm_checks: [
              {
                key: 'feedback_and_threshold_missing',
                label: '升级反馈与门槛',
                status: 'pass',
                before_after_contrast: '升级前被审判压制，升级后旧印改变资格判断。',
                instant_feedback: '旧印亮出后审判阵纹当场改色。',
                delayed_feedback: '长老席追查内库阵图，形成后续压力。',
                new_threshold: '必须解释旧印来源并承受更高层级追查。',
                cheat_rule: '旧印只在接触阵纹时触发资格反证，不能随意开挂。',
                evidence: '修订稿补出升级前被压制、旧印即时改变审判资格、延迟引出更高门槛，并把金手指触发规则写成动作反馈。',
                fix: '补升级前后对比、即时反馈、延迟反馈、新门槛和金手指规则。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('升级节奏复检通过')
    expect(cleared.note).toContain('upgrade_rhythm_checks')
  })

})
