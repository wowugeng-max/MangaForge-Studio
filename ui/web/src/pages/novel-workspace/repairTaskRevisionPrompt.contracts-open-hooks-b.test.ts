import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import {
  buildDeliveryRiskRevisionClosurePlan,
  buildRepairTaskRevisionPrompt,
  listQualityContractRequiredFields,
  listQualityContractRequiredFieldKeys,
} from './repairTaskRevisionPrompt'

describe('buildRepairTaskRevisionPrompt contracts/open-until-clear/hooks b', () => {
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
