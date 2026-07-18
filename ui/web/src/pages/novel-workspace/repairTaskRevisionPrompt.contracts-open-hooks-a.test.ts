import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import {
  buildDeliveryRiskRevisionClosurePlan,
  buildRepairTaskRevisionPrompt,
  listQualityContractRequiredFields,
  listQualityContractRequiredFieldKeys,
} from './repairTaskRevisionPrompt'

describe('buildRepairTaskRevisionPrompt contracts/open-until-clear/hooks a', () => {
  test('keeps word count repair tasks open until word count checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'word_count_gap',
        annotation_category: 'word_count',
        annotation_key: 'prose_quality:202:12:12:word_count_gap:字数不足',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            word_count_checks: [
              {
                key: 'under_target_count',
                label: '字数不足',
                status: 'warn',
                actual: '当前 3880 字，低于最低门槛 4050 字。',
                fix: '继续扩充动作链、对白交锋和章末承接。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('字数验证仍未闭环')
    expect(residual.note).toContain('字数不足')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'word_count_gap',
        annotation_category: 'word_count',
        annotation_key: 'prose_quality:202:12:12:word_count_gap:字数不足',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            word_count_checks: [
              {
                key: 'under_target_count',
                label: '字数不足',
                status: 'pass',
                evidence: '当前 4180 字，已高于最低门槛 4050 字。',
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
    expect(missingContractFields.note).toContain('current_count')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'word_count_gap',
        annotation_category: 'word_count',
        annotation_key: 'prose_quality:202:12:12:word_count_gap:字数不足',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            word_count_checks: [
              {
                key: 'under_target_count',
                label: '字数不足',
                status: 'pass',
                current_count: 4180,
                target_count: 4500,
                min_required_count: 4050,
                actual: '当前 4180 字，已高于最低门槛 4050 字。',
                evidence: '新增对白交锋和章末承接后，当前 4180 字，已高于最低门槛 4050 字。',
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
    expect(cleared.note).toContain('字数验证复检通过')
    expect(cleared.note).toContain('word_count_checks')
  })

  test('keeps style boundary repair tasks open until style boundary checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'style_boundary_gap',
        annotation_category: 'style_boundary',
        annotation_key: 'prose_quality:202:12:12:style_boundary_gap:风格边界',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            style_boundary_checks: [
              {
                key: 'source_copy_risk',
                label: '参照句式过近',
                status: 'warn',
                evidence: '正文仍沿用标杆样章的句式节奏。',
                fix: '改用本章动作链和角色口吻重写。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('风格边界仍未闭环')
    expect(residual.note).toContain('参照句式过近')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'style_boundary_gap',
        annotation_category: 'style_boundary',
        annotation_key: 'prose_quality:202:12:12:style_boundary_gap:风格边界',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            style_boundary_checks: [
              {
                key: 'source_copy_risk',
                label: '参照句式过近',
                status: 'pass',
                evidence: '修订稿改成本章动作链和角色口吻，没有复用标杆句式。',
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
    expect(missingContractFields.note).toContain('reference_risk')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'style_boundary_gap',
        annotation_category: 'style_boundary',
        annotation_key: 'prose_quality:202:12:12:style_boundary_gap:风格边界',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            style_boundary_checks: [
              {
                key: 'source_copy_risk',
                label: '参照句式过近',
                status: 'pass',
                reference_risk: '标杆样章句式节奏过近',
                rewritten_with_local_action: '改成本章验印、封门和旧钥匙动作链',
                voice_anchor: '主角克制短句，执事冷硬失控',
                copied_phrase_removed: '已移除标杆句式和相近节奏',
                evidence: '修订稿改成本章动作链和角色口吻，没有复用标杆句式。',
                fix: '补参照风险、本章动作链重写、口吻锚点和移除证据。',
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
    expect(cleared.note).toContain('风格边界复检通过')
    expect(cleared.note).toContain('style_boundary_checks')
  })

  test('keeps information flow repair tasks open until information flow checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'information_flow_gap',
        annotation_category: 'information_flow',
        annotation_key: 'prose_quality:202:12:12:information_flow_gap:信息流',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            information_flow_checks: [
              {
                key: 'reveal_order',
                label: '线索揭示顺序',
                status: 'warn',
                evidence: '正文仍先解释封条真相，导致悬念提前泄底。',
                fix: '先写误判和供词异常，再揭示封条真相。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('信息流仍未闭环')
    expect(residual.note).toContain('线索揭示顺序')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'information_flow_gap',
        annotation_category: 'information_flow',
        annotation_key: 'prose_quality:202:12:12:information_flow_gap:信息流',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            information_flow_checks: [
              {
                key: 'reveal_order',
                label: '线索揭示顺序',
                status: 'pass',
                evidence: '修订稿先写误判和供词异常，再用封条真相收束本场。',
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
    expect(missingContractFields.note).toContain('reveal_order')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'information_flow_gap',
        annotation_category: 'information_flow',
        annotation_key: 'prose_quality:202:12:12:information_flow_gap:信息流',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            information_flow_checks: [
              {
                key: 'reveal_order',
                label: '线索揭示顺序',
                status: 'pass',
                reveal_order: '先误判，再供词异常，最后揭封条真相',
                withheld_question: '谁提前动过封条阵纹',
                action_bound_release: '主角验印动作触发真相释放',
                conflict_or_cost: '提前泄底会失去审判反压效果',
                evidence: '修订稿先写误判和供词异常，再用封条真相收束本场。',
                fix: '补揭示顺序、保留问题、动作绑定释放和冲突代价。',
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
    expect(cleared.note).toContain('信息流复检通过')
    expect(cleared.note).toContain('information_flow_checks')
  })

  test('keeps expectation threshold repair tasks open until expectation threshold checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'expectation_threshold_gap',
        annotation_category: 'expectation_threshold',
        annotation_key: 'prose_quality:202:12:12:expectation_threshold_gap:期待阈值',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            expectation_threshold_checks: [
              {
                key: 'page_turn_question',
                label: '章末追问强度',
                status: 'warn',
                evidence: '章末仍只说封条异常，没有形成必须点下一章的问题。',
                fix: '把异常落到未揭身份、代价或选择压力上。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('期待阈值仍未闭环')
    expect(residual.note).toContain('章末追问强度')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'expectation_threshold_gap',
        annotation_category: 'expectation_threshold',
        annotation_key: 'prose_quality:202:12:12:expectation_threshold_gap:期待阈值',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            expectation_threshold_checks: [
              {
                key: 'page_turn_question',
                label: '章末追问强度',
                status: 'pass',
                evidence: '章末把封条异常落到未揭身份和下一章选择压力。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('期待阈值仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('reader_question')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'expectation_threshold_gap',
        annotation_category: 'expectation_threshold',
        annotation_key: 'prose_quality:202:12:12:expectation_threshold_gap:期待阈值',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            expectation_threshold_checks: [
              {
                key: 'page_turn_question',
                label: '章末追问强度',
                status: 'pass',
                reader_question: '封条背后的未揭身份到底是谁。',
                stakes: '若身份被长老席先查到，主角临时资格会被反咬。',
                choice_pressure: '主角必须决定是否当场追查内库阵图。',
                payoff_promise: '下一章会兑现未揭身份和内库阵图线索。',
                next_chapter_pull: '长老席追查内库阵图，逼出下一章行动。',
                evidence: '章末把封条异常落到未揭身份和下一章选择压力。',
                fix: '补具体读者问题、代价、选择压力和下一章牵引。',
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
    expect(cleared.note).toContain('期待阈值复检通过')
    expect(cleared.note).toContain('expectation_threshold_checks')
  })

  test('keeps story loop repair tasks open until story loop checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'story_loop_gap',
        annotation_category: 'story_loop',
        annotation_key: 'prose_quality:202:12:12:story_loop_gap:故事闭环',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            story_loop_checks: [
              {
                key: 'setup_payoff_loop',
                label: '设问回收闭环',
                status: 'warn',
                evidence: '开头抛出谁换了封条，但结尾没有推进答案、代价或新问题。',
                fix: '推进一个答案碎片，并把新问题挂到下一章钩子。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('故事闭环仍未闭环')
    expect(residual.note).toContain('设问回收闭环')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'story_loop_gap',
        annotation_category: 'story_loop',
        annotation_key: 'prose_quality:202:12:12:story_loop_gap:故事闭环',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            story_loop_checks: [
              {
                key: 'setup_payoff_loop',
                label: '设问回收闭环',
                status: 'pass',
                evidence: '结尾推进一个答案碎片，并把新问题挂到下一章钩子。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('故事闭环仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('setup_question')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'story_loop_gap',
        annotation_category: 'story_loop',
        annotation_key: 'prose_quality:202:12:12:story_loop_gap:故事闭环',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            story_loop_checks: [
              {
                key: 'setup_payoff_loop',
                label: '设问回收闭环',
                status: 'pass',
                setup_question: '谁换了封条。',
                obstacle: '长老席压住证据，不允许主角继续追查。',
                choice: '主角选择用旧印核对封条阵纹。',
                cost: '临时资格暴露，招来内库阵图追查。',
                payoff_or_answer_fragment: '封条异常指向内库阵图。',
                new_question: '内库阵图是谁提前动过。',
                evidence: '结尾推进一个答案碎片，并把新问题挂到下一章钩子。',
                fix: '补设问、阻碍、选择、代价、答案碎片和新问题。',
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
    expect(cleared.note).toContain('故事闭环复检通过')
    expect(cleared.note).toContain('story_loop_checks')
  })

  test('keeps emotional arc repair tasks open until emotional arc checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'emotional_arc_gap',
        annotation_category: 'emotional_arc',
        annotation_key: 'prose_quality:202:12:12:emotional_arc_gap:情绪弧',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            emotional_arc_checks: [
              {
                key: 'pressure_release',
                label: '压迫释放弧',
                status: 'warn',
                evidence: '正文仍直接解释规则，没有写出调动、反制和爽感释放。',
                fix: '把压迫落到现场选择，用动作和对白完成反制。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('情绪弧仍未闭环')
    expect(residual.note).toContain('压迫释放弧')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'emotional_arc_gap',
        annotation_category: 'emotional_arc',
        annotation_key: 'prose_quality:202:12:12:emotional_arc_gap:情绪弧',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            emotional_arc_checks: [
              {
                key: 'pressure_release',
                label: '压迫释放弧',
                status: 'pass',
                evidence: '修订稿用现场选择完成压迫、反制和旁观反馈。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('情绪弧仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('calm_or_pressure')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'emotional_arc_gap',
        annotation_category: 'emotional_arc',
        annotation_key: 'prose_quality:202:12:12:emotional_arc_gap:情绪弧',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            emotional_arc_checks: [
              {
                key: 'pressure_release',
                label: '压迫释放弧',
                status: 'pass',
                calm_or_pressure: '长老席当众否定主角资格，形成公开压迫。',
                mobilization: '主角被迫在众人注视下选择是否亮出旧印。',
                counteraction: '主角用旧印核对阵纹并反压长老席判断。',
                release: '阵纹改色后，围观者第一次倒向主角。',
                reader_payoff: '读者获得被轻视后当场反制的尊严爽感。',
                evidence: '修订稿用现场选择完成压迫、反制和旁观反馈。',
                fix: '补压迫、调动、反制、释放和读者回报。',
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
    expect(cleared.note).toContain('情绪弧复检通过')
    expect(cleared.note).toContain('emotional_arc_checks')
  })

})
