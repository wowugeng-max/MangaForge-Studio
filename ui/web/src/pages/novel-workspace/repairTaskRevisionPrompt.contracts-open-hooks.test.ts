import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import {
  buildDeliveryRiskRevisionClosurePlan,
  buildRepairTaskRevisionPrompt,
  listQualityContractRequiredFields,
  listQualityContractRequiredFieldKeys,
} from './repairTaskRevisionPrompt'

describe('buildRepairTaskRevisionPrompt contracts/open-until-clear/hooks', () => {
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

  test('keeps chapter hook repair tasks open until chapter hook checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'chapter_hook_gap',
        annotation_category: 'chapter_hook',
        annotation_key: 'prose_quality:202:12:12:chapter_hook_gap:章级钩子',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            chapter_hook_checks: [
              {
                key: 'ending_page_turn',
                label: '章尾翻页钩子',
                status: 'warn',
                evidence: '最后一幕仍只写封条异常，没有形成具体翻页问题。',
                fix: '把异常落到未揭身份和下一章选择压力。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('章级钩子仍未闭环')
    expect(residual.note).toContain('章尾翻页钩子')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'chapter_hook_gap',
        annotation_category: 'chapter_hook',
        annotation_key: 'prose_quality:202:12:12:chapter_hook_gap:章级钩子',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            chapter_hook_checks: [
              {
                key: 'ending_page_turn',
                label: '章尾翻页钩子',
                status: 'pass',
                evidence: '最后一幕把封条异常落到未揭身份和下一章选择压力。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('章级钩子仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('hook_position')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'chapter_hook_gap',
        annotation_category: 'chapter_hook',
        annotation_key: 'prose_quality:202:12:12:chapter_hook_gap:章级钩子',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            chapter_hook_checks: [
              {
                key: 'ending_page_turn',
                label: '章尾翻页钩子',
                status: 'pass',
                hook_position: 'ending',
                trigger: '封条异常指向未揭身份。',
                reader_question: '封条背后的未揭身份是谁。',
                next_chapter_pressure: '主角下一章必须在长老席追查前作出选择。',
                delivered_evidence: '最后一幕把封条异常落到未揭身份和下一章选择压力。',
                evidence: '最后一幕把封条异常落到未揭身份和下一章选择压力。',
                fix: '把章尾异常改成具体翻页问题和下一章压力。',
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
    expect(cleared.note).toContain('章级钩子复检通过')
    expect(cleared.note).toContain('chapter_hook_checks')
  })

  test('keeps paragraph hook repair tasks open until paragraph hook checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'paragraph_hook_gap',
        annotation_category: 'paragraph_hook',
        annotation_key: 'prose_quality:202:12:12:paragraph_hook_gap:段落级钩子',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            paragraph_hook_checks: [
              {
                key: 'micro_hook_stall',
                label: '段落微推进',
                status: 'warn',
                evidence: '连续段落仍只有环境和站位，没有信息、风险、情绪或关系变化。',
                fix: '加入暗牌、倒计时或对话压迫。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('段落级钩子仍未闭环')
    expect(residual.note).toContain('段落微推进')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'paragraph_hook_gap',
        annotation_category: 'paragraph_hook',
        annotation_key: 'prose_quality:202:12:12:paragraph_hook_gap:段落级钩子',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            paragraph_hook_checks: [
              {
                key: 'micro_hook_stall',
                label: '段落微推进',
                status: 'pass',
                evidence: '修订稿每3-5段都有暗牌、对话压迫或风险变化。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('段落级钩子仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('paragraph_range')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'paragraph_hook_gap',
        annotation_category: 'paragraph_hook',
        annotation_key: 'prose_quality:202:12:12:paragraph_hook_gap:段落级钩子',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            paragraph_hook_checks: [
              {
                key: 'micro_hook_stall',
                label: '段落微推进',
                status: 'pass',
                paragraph_range: '第4-8段',
                hook_type: '暗牌 + 对话压迫',
                micro_change: '封条异常从环境信息变成现场风险。',
                information_or_risk_delta: '长老席发现封条阵纹与旧印同源。',
                emotion_or_relation_delta: '围观者从冷眼转为低声议论，主角压力上升。',
                evidence: '修订稿每3-5段都有暗牌、对话压迫或风险变化。',
                fix: '加入暗牌、对话压迫和风险变化。',
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
    expect(cleared.note).toContain('段落级钩子复检通过')
    expect(cleared.note).toContain('paragraph_hook_checks')
  })

  test('keeps suspense repair tasks open until suspense checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'suspense_gap',
        annotation_category: 'suspense',
        annotation_key: 'prose_quality:202:12:12:suspense_gap:悬念编排',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            suspense_checks: [
              {
                key: 'question_misdirect_answer',
                label: '疑问误导答案循环',
                status: 'warn',
                evidence: '正文仍只有封条异常，没有可信误导、局部答案或新期待。',
                fix: '补假提示和局部答案。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('悬念编排仍未闭环')
    expect(residual.note).toContain('疑问误导答案循环')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'suspense_gap',
        annotation_category: 'suspense',
        annotation_key: 'prose_quality:202:12:12:suspense_gap:悬念编排',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            suspense_checks: [
              {
                key: 'question_misdirect_answer',
                label: '疑问误导答案循环',
                status: 'pass',
                evidence: '修订稿先提出疑问，再给假提示，章末公布局部答案并立起新期待。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('悬念编排仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('question')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'suspense_gap',
        annotation_category: 'suspense',
        annotation_key: 'prose_quality:202:12:12:suspense_gap:悬念编排',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            suspense_checks: [
              {
                key: 'question_misdirect_answer',
                label: '疑问误导答案循环',
                status: 'pass',
                question: '封条是谁换的。',
                misdirect: '表面线索指向守门弟子。',
                partial_answer: '封条阵纹其实来自内库阵图。',
                new_expectation: '下一章追查谁能接触内库阵图。',
                evidence: '修订稿先提出疑问，再给假提示，章末公布局部答案并立起新期待。',
                fix: '补疑问、可信误导、局部答案和新期待。',
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
    expect(cleared.note).toContain('悬念编排复检通过')
    expect(cleared.note).toContain('suspense_checks')
  })

  test('keeps asset linkage repair tasks open until asset linkage checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'asset_linkage_gap',
        annotation_category: 'asset_linkage',
        annotation_key: 'prose_quality:202:12:12:asset_linkage_gap:资产挂钩',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            asset_linkage_checks: [
              {
                key: 'isolated_assets',
                label: '孤立资产',
                status: 'warn',
                evidence: '旧钥匙仍只被点名，没有推进目标、制造阻碍、兑现伏笔或打开章尾钩子。',
                fix: '让旧钥匙触发暗格并带来锁死代价。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('资产挂钩仍未闭环')
    expect(residual.note).toContain('孤立资产')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'asset_linkage_gap',
        annotation_category: 'asset_linkage',
        annotation_key: 'prose_quality:202:12:12:asset_linkage_gap:资产挂钩',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            asset_linkage_checks: [
              {
                key: 'isolated_assets',
                label: '孤立资产',
                status: 'pass',
                evidence: '修订稿让旧钥匙触发暗格、锁死退路，并把账本原件位置推到章尾钩子。',
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
    expect(missingContractFields.note).toContain('asset_name')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'asset_linkage_gap',
        annotation_category: 'asset_linkage',
        annotation_key: 'prose_quality:202:12:12:asset_linkage_gap:资产挂钩',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            asset_linkage_checks: [
              {
                key: 'isolated_assets',
                label: '孤立资产',
                status: 'pass',
                asset_name: '旧钥匙',
                function: '触发暗格并暴露账本原件位置',
                ownership: '主角暂持',
                trigger_condition: '钥匙碰到内库阵纹',
                limitation: '只能开启一次且会留下阵纹痕迹',
                consequence: '退路被锁死，必须立刻核验账本',
                story_link: '把孤立道具接到主线账本追查和章尾钩子',
                evidence: '修订稿让旧钥匙触发暗格、锁死退路，并把账本原件位置推到章尾钩子。',
                fix: '补功能、归属、触发条件、限制、后果和主线挂钩。',
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
    expect(cleared.note).toContain('资产挂钩复检通过')
    expect(cleared.note).toContain('asset_linkage_checks')
  })

  test('keeps dialogue repair tasks open until dialogue checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'dialogue_gap',
        annotation_category: 'dialogue',
        annotation_key: 'prose_quality:202:12:12:dialogue_gap:对白质量',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            dialogue_checks: [
              {
                key: 'subtext_agenda',
                label: '潜台词与议程',
                status: 'warn',
                evidence: '周薄森仍在直接解释真实目的，整段对白像说明书。',
                fix: '改成借口、试探、回避和动作反应。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('对白质量仍未闭环')
    expect(residual.note).toContain('潜台词与议程')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'dialogue_gap',
        annotation_category: 'dialogue',
        annotation_key: 'prose_quality:202:12:12:dialogue_gap:对白质量',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            dialogue_checks: [
              {
                key: 'subtext_agenda',
                label: '潜台词与议程',
                status: 'pass',
                evidence: '修订稿把真实目的改成借口、试探、回避和动作反应，短句方成为权力上位。',
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
    expect(missingContractFields.note).toContain('speaker')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'dialogue_gap',
        annotation_category: 'dialogue',
        annotation_key: 'prose_quality:202:12:12:dialogue_gap:对白质量',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            dialogue_checks: [
              {
                key: 'subtext_agenda',
                label: '潜台词与议程',
                status: 'pass',
                speaker: '周薄森',
                agenda: '试探主角是否拿到账本编号',
                subtext: '用关心阵盘资格掩盖威胁',
                power_shift: '短句追问让周薄森暂时占上风',
                information_delta: '读者得知账本编号已被协会盯上',
                character_voice: '克制、冷硬、以规矩压人',
                evidence: '修订稿把真实目的改成借口、试探、回避和动作反应，短句方成为权力上位。',
                fix: '补说话人议程、潜台词、权力变化、信息增量和声线差异。',
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
    expect(cleared.note).toContain('对白质量复检通过')
    expect(cleared.note).toContain('dialogue_checks')
  })

  test('keeps plot dynamics repair tasks open until plot dynamics checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'plot_dynamics_gap',
        annotation_category: 'plot_dynamics',
        annotation_key: 'prose_quality:202:12:12:plot_dynamics_gap:剧情动力',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            plot_dynamics_checks: [
              {
                key: 'goal_obstacle_action_feedback',
                label: '剧情闭环',
                status: 'warn',
                evidence: '红色阀门仍没有形成目标、阻碍、行动、代价/反馈、新期待闭环。',
                fix: '补账本编号目标、协会阻碍、行动和代价反馈。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('剧情动力仍未闭环')
    expect(residual.note).toContain('剧情闭环')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'plot_dynamics_gap',
        annotation_category: 'plot_dynamics',
        annotation_key: 'prose_quality:202:12:12:plot_dynamics_gap:剧情动力',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            plot_dynamics_checks: [
              {
                key: 'goal_obstacle_action_feedback',
                label: '剧情闭环',
                status: 'pass',
                evidence: '修订稿先立账本编号目标和协会阻碍，再写主角行动、代价反馈和新的章末期待。',
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
    expect(missingContractFields.note).toContain('goal')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'plot_dynamics_gap',
        annotation_category: 'plot_dynamics',
        annotation_key: 'prose_quality:202:12:12:plot_dynamics_gap:剧情动力',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            plot_dynamics_checks: [
              {
                key: 'goal_obstacle_action_feedback',
                label: '剧情闭环',
                status: 'pass',
                goal: '拿到账本编号并证明内库被调包',
                obstacle: '协会封锁账房并派人核验阵纹',
                action: '主角用旧钥匙触发暗格反查编号',
                cost_or_feedback: '阵盘资格被临时冻结',
                new_expectation: '下一章必须查出谁能接触内库阵图',
                evidence: '修订稿先立账本编号目标和协会阻碍，再写主角行动、代价反馈和新的章末期待。',
                fix: '补目标、阻碍、行动、代价反馈和新期待。',
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
    expect(cleared.note).toContain('剧情动力复检通过')
    expect(cleared.note).toContain('plot_dynamics_checks')
  })})
