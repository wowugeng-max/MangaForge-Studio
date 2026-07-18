import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import {
  buildDeliveryRiskRevisionClosurePlan,
  buildRepairTaskRevisionPrompt,
  listQualityContractRequiredFields,
  listQualityContractRequiredFieldKeys,
} from './repairTaskRevisionPrompt'

describe('buildRepairTaskRevisionPrompt specialty/audience b', () => {
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
