import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import {
  buildDeliveryRiskRevisionClosurePlan,
  buildRepairTaskRevisionPrompt,
  listQualityContractRequiredFields,
  listQualityContractRequiredFieldKeys,
} from './repairTaskRevisionPrompt'

describe('buildRepairTaskRevisionPrompt specialty/audience a', () => {
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

})
