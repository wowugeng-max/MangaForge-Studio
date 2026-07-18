import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import {
  buildDeliveryRiskRevisionClosurePlan,
  buildRepairTaskRevisionPrompt,
  listQualityContractRequiredFields,
  listQualityContractRequiredFieldKeys,
} from './repairTaskRevisionPrompt'

describe('buildRepairTaskRevisionPrompt specialty', () => {
  test('keeps character relation repair tasks open until character relation checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'character_relation_gap',
        annotation_category: 'character_relation',
        annotation_key: 'prose_quality:202:12:12:character_relation_gap:角色关系',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            character_relation_checks: [
              {
                key: 'goal_ownership',
                label: '目标归属',
                status: 'warn',
                evidence: '主角仍只是在帮林栖雨追查旧案，缺少自己的诉求、主动选择和代价。',
                fix: '补主角自己的风险、选择和代价。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('角色关系仍未闭环')
    expect(residual.note).toContain('目标归属')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'character_relation_gap',
        annotation_category: 'character_relation',
        annotation_key: 'prose_quality:202:12:12:character_relation_gap:角色关系',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            character_relation_checks: [
              {
                key: 'goal_ownership',
                label: '目标归属',
                status: 'pass',
                evidence: '修订稿让旧案威胁主角阵盘资格，主角主动押上名额交换线索。',
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
    expect(missingContractFields.note).toContain('relation_type')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'character_relation_gap',
        annotation_category: 'character_relation',
        annotation_key: 'prose_quality:202:12:12:character_relation_gap:角色关系',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            character_relation_checks: [
              {
                key: 'goal_ownership',
                label: '目标归属',
                status: 'pass',
                relation_type: '互相试探的临时同盟',
                protagonist_goal: '保住阵盘资格并查清旧案牵连',
                agency_choice: '主动押上名额交换线索',
                cost: '若查错将失去内门资格',
                relation_shift: '从被动帮忙转为共同承担风险',
                evidence: '修订稿让旧案威胁主角阵盘资格，主角主动押上名额交换线索。',
                fix: '补关系类型、主角目标、主动选择、代价和关系变化。',
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
    expect(cleared.note).toContain('角色关系复检通过')
    expect(cleared.note).toContain('character_relation_checks')
  })

  test('keeps character behavior repair tasks open until character behavior checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'character_behavior_gap',
        annotation_category: 'character_behavior',
        annotation_key: 'prose_quality:202:12:12:character_behavior_gap:角色行为',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            character_behavior_checks: [
              {
                key: 'motivation_specificity',
                label: '动机具体性',
                status: 'warn',
                evidence: '主角仍只是想变强，缺少具体起因、情感理由和动机演变铺垫。',
                fix: '补具体事件、情感理由和代价。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('角色行为仍未闭环')
    expect(residual.note).toContain('动机具体性')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'character_behavior_gap',
        annotation_category: 'character_behavior',
        annotation_key: 'prose_quality:202:12:12:character_behavior_gap:角色行为',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            character_behavior_checks: [
              {
                key: 'motivation_specificity',
                label: '动机具体性',
                status: 'pass',
                evidence: '修订稿把动机落到阵盘资格被夺的具体事件，并补出主角承担母亲旧约代价的情感理由。',
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
    expect(missingContractFields.note).toContain('concrete_motive')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'character_behavior_gap',
        annotation_category: 'character_behavior',
        annotation_key: 'prose_quality:202:12:12:character_behavior_gap:角色行为',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            character_behavior_checks: [
              {
                key: 'motivation_specificity',
                label: '动机具体性',
                status: 'pass',
                character: '主角',
                concrete_motive: '阵盘资格被夺会让母亲旧约作废',
                emotional_reason: '不愿母亲最后留下的名额被宗门抹掉',
                trigger_change: '旧钥匙显出内库阵纹后确认有人调包',
                visible_choice: '押上名额继续查账',
                cost: '查错即失去内门资格',
                evidence: '修订稿把动机落到阵盘资格被夺的具体事件，并补出主角承担母亲旧约代价的情感理由。',
                fix: '补人物、具体动机、情感理由、触发变化、可见选择和代价。',
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
    expect(cleared.note).toContain('角色行为复检通过')
    expect(cleared.note).toContain('character_behavior_checks')
  })

  test('keeps conflict structure repair tasks open until conflict structure checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'conflict_structure_gap',
        annotation_category: 'conflict_structure',
        annotation_key: 'prose_quality:202:12:12:conflict_structure_gap:冲突结构',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            conflict_structure_checks: [
              {
                key: 'no_exit_stakes',
                label: '有进无出',
                status: 'warn',
                evidence: '主角仍可以随时离开账房，没人阻止他拿到账本，也没有退出代价。',
                fix: '补阻止者、封闭场所和退出代价。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('冲突结构仍未闭环')
    expect(residual.note).toContain('有进无出')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'conflict_structure_gap',
        annotation_category: 'conflict_structure',
        annotation_key: 'prose_quality:202:12:12:conflict_structure_gap:冲突结构',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            conflict_structure_checks: [
              {
                key: 'no_exit_stakes',
                label: '有进无出',
                status: 'pass',
                evidence: '修订稿让内门执事封门并押上阵盘资格，主角必须完成账本核验才能脱身。',
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
    expect(missingContractFields.note).toContain('no_exit_condition')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'conflict_structure_gap',
        annotation_category: 'conflict_structure',
        annotation_key: 'prose_quality:202:12:12:conflict_structure_gap:冲突结构',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            conflict_structure_checks: [
              {
                key: 'no_exit_stakes',
                label: '有进无出',
                status: 'pass',
                blocker: '内门执事封门核账',
                no_exit_condition: '账房阵门锁死，离开会触发私闯内库罪名',
                stakes_or_exit_cost: '阵盘资格和母亲旧约一起作废',
                action_block: '主角必须现场核验账本编号',
                win_loss_result: '找到调包痕迹但暴露旧钥匙',
                evidence: '修订稿让内门执事封门并押上阵盘资格，主角必须完成账本核验才能脱身。',
                fix: '补阻止者、无退路条件、退出代价、行动阻断和输赢结果。',
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
    expect(cleared.note).toContain('冲突结构复检通过')
    expect(cleared.note).toContain('conflict_structure_checks')
  })

  test('keeps opening repair tasks open until opening checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'opening_gap',
        annotation_category: 'opening',
        annotation_key: 'prose_quality:202:12:12:opening_gap:开篇设计',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            opening_checks: [
              {
                key: 'protagonist_entry_delay',
                label: '300字主角登场',
                status: 'warn',
                evidence: '开头仍连续写宗门天气和旧史，主角第900字才出现，1000字内没有期待点。',
                fix: '第一段让主角进入验阵台，补目标和期待点。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('开篇设计仍未闭环')
    expect(residual.note).toContain('300字主角登场')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'opening_gap',
        annotation_category: 'opening',
        annotation_key: 'prose_quality:202:12:12:opening_gap:开篇设计',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            opening_checks: [
              {
                key: 'protagonist_entry_delay',
                label: '300字主角登场',
                status: 'pass',
                evidence: '修订稿第一段让主角被叫到验阵台，300字内亮明目标，1000字内给出阵盘资格被夺的爽点/危机。',
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
    expect(missingContractFields.note).toContain('protagonist_entry')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'opening_gap',
        annotation_category: 'opening',
        annotation_key: 'prose_quality:202:12:12:opening_gap:开篇设计',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            opening_checks: [
              {
                key: 'protagonist_entry_delay',
                label: '300字主角登场',
                status: 'pass',
                protagonist_entry: '第一段被叫到验阵台',
                first_300_goal: '保住阵盘资格并查清谁调包',
                first_1000_expectation: '资格被夺的爽点/危机在千字内抛出',
                opening_principle: '主角、目标、危机、期待点前置',
                evidence: '修订稿第一段让主角被叫到验阵台，300字内亮明目标，1000字内给出阵盘资格被夺的爽点/危机。',
                fix: '把宗门旧史后移，首段进入验阵台并立目标。',
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
    expect(cleared.note).toContain('开篇设计复检通过')
    expect(cleared.note).toContain('opening_checks')
  })

  test('keeps bridge unit repair tasks open until bridge unit checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'bridge_unit_gap',
        annotation_category: 'bridge_unit',
        annotation_key: 'prose_quality:202:12:12:bridge_unit_gap:桥段节奏',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            bridge_unit_checks: [
              {
                key: 'expectation_chain_break',
                label: '连续期待',
                status: 'warn',
                evidence: '旧城会审兑现旧期待后仍直接散场，章尾没有新目标，也没有高潮中埋钩子。',
                fix: '兑现账本爽点前先挂赤炉城供奉新目标，章尾给连续小期待。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('桥段节奏仍未闭环')
    expect(residual.note).toContain('连续期待')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'bridge_unit_gap',
        annotation_category: 'bridge_unit',
        annotation_key: 'prose_quality:202:12:12:bridge_unit_gap:桥段节奏',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            bridge_unit_checks: [
              {
                key: 'expectation_chain_break',
                label: '连续期待',
                status: 'pass',
                evidence: '修订稿兑现账本爽点前先挂赤炉城供奉新目标，高潮中埋钩子，章尾给连续小期待。',
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
    expect(missingContractFields.note).toContain('bridge_position')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'bridge_unit_gap',
        annotation_category: 'bridge_unit',
        annotation_key: 'prose_quality:202:12:12:bridge_unit_gap:桥段节奏',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            bridge_unit_checks: [
              {
                key: 'expectation_chain_break',
                label: '连续期待',
                status: 'pass',
                bridge_position: '旧城会审转入赤炉城供奉线之前',
                old_expectation_payoff: '账本调包证据被公开兑现',
                new_expectation_seed: '赤炉城供奉牵出内库阵图来源',
                goal_progression: '主角从自证清白推进到追查供奉',
                climax_hook: '高潮中埋下供奉与旧钥匙同纹的钩子',
                stage_handoff: '章尾交接到赤炉城供奉登场',
                evidence: '修订稿兑现账本爽点前先挂赤炉城供奉新目标，高潮中埋钩子，章尾给连续小期待。',
                fix: '补旧期待兑现、新期待种子、目标推进和阶段交接。',
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
    expect(cleared.note).toContain('桥段节奏复检通过')
    expect(cleared.note).toContain('bridge_unit_checks')
  })

  test('keeps reversal repair tasks open until reversal checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'reversal_gap',
        annotation_category: 'reversal',
        annotation_key: 'prose_quality:202:12:12:reversal_gap:反转设计',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            reversal_checks: [
              {
                key: 'setup_clues_missing',
                label: '铺垫暗示',
                status: 'warn',
                evidence: '执事身份反转仍是揭示时才出现的新信息，前文没有3处公平暗示。',
                fix: '在验印、账页错位、证人迟疑里提前埋3处暗示。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('反转设计仍未闭环')
    expect(residual.note).toContain('铺垫暗示')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'reversal_gap',
        annotation_category: 'reversal',
        annotation_key: 'prose_quality:202:12:12:reversal_gap:反转设计',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            reversal_checks: [
              {
                key: 'setup_clues_missing',
                label: '铺垫暗示',
                status: 'pass',
                evidence: '修订稿在验印、账页错位、证人迟疑里提前埋3处暗示，揭示时用旧印反证直接改变局势。',
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
    expect(missingContractFields.note).toContain('reversal_type')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'reversal_gap',
        annotation_category: 'reversal',
        annotation_key: 'prose_quality:202:12:12:reversal_gap:反转设计',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            reversal_checks: [
              {
                key: 'setup_clues_missing',
                label: '铺垫暗示',
                status: 'pass',
                reversal_type: '身份与证据归属反转',
                fair_clues: '验印、账页错位、证人迟疑三处提前暗示',
                misdirect: '表面指向守门弟子偷换账页',
                reveal_timing: '执事判罚落槌前用旧印反证',
                impact_after_reveal: '审判资格转移，主角从被审转为追查者',
                evidence: '修订稿在验印、账页错位、证人迟疑里提前埋3处暗示，揭示时用旧印反证直接改变局势。',
                fix: '补公平暗示、误导、揭示时机和揭示后的局势变化。',
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
    expect(cleared.note).toContain('反转设计复检通过')
    expect(cleared.note).toContain('reversal_checks')
  })

  test('keeps showdown repair tasks open until showdown checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'showdown_gap',
        annotation_category: 'showdown',
        annotation_key: 'prose_quality:202:12:12:showdown_gap:高潮对抗',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            showdown_checks: [
              {
                key: 'payoff_release_missing',
                label: '爽点释放',
                status: 'warn',
                evidence: '主角亮出旧印后执事仍没有受到对应压制，旁观者只统一震惊。',
                fix: '让执事当场失去审判资格，并分层写三方反应。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('高潮对抗仍未闭环')
    expect(residual.note).toContain('爽点释放')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'showdown_gap',
        annotation_category: 'showdown',
        annotation_key: 'prose_quality:202:12:12:showdown_gap:高潮对抗',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            showdown_checks: [
              {
                key: 'payoff_release_missing',
                label: '爽点释放',
                status: 'pass',
                evidence: '修订稿让执事当场失去审判资格，分层写友方、敌方、中立方反应，并补长老追查内库阵图的新门槛。',
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
    expect(missingContractFields.note).toContain('payoff_release')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'showdown_gap',
        annotation_category: 'showdown',
        annotation_key: 'prose_quality:202:12:12:showdown_gap:高潮对抗',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            showdown_checks: [
              {
                key: 'payoff_release_missing',
                label: '爽点释放',
                status: 'pass',
                payoff_release: '执事当场失去审判资格',
                trump_card_used: '旧印反证内库阵图被调包',
                pressure_layers: '封门、判罚、资格作废三层压力逐级释放',
                audience_reactions: '友方松气、敌方失控、中立长老改判',
                consequence: '主角获得追查内库阵图的临时权',
                next_threshold: '赤炉城供奉成为下一道门槛',
                evidence: '修订稿让执事当场失去审判资格，分层写友方、敌方、中立方反应，并补长老追查内库阵图的新门槛。',
                fix: '补爽点释放、底牌使用、压力层、观众反应、后果和下一门槛。',
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
    expect(cleared.note).toContain('高潮对抗复检通过')
    expect(cleared.note).toContain('showdown_checks')
  })

  test('keeps prose craft repair tasks open until prose craft checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'prose_craft_gap',
        annotation_category: 'prose_craft',
        annotation_key: 'prose_quality:202:12:12:prose_craft_gap:正文工艺',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            prose_craft_checks: [
              {
                key: 'omniscient_crowd_camera',
                label: '远景概括',
                status: 'warn',
                evidence: '高潮段仍连续写全场死寂、所有人震惊，没有主角深度限知。',
                fix: '改成主角感知、身体动作和环境交互承接。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('正文工艺仍未闭环')
    expect(residual.note).toContain('远景概括')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'prose_craft_gap',
        annotation_category: 'prose_craft',
        annotation_key: 'prose_quality:202:12:12:prose_craft_gap:正文工艺',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            prose_craft_checks: [
              {
                key: 'omniscient_crowd_camera',
                label: '远景概括',
                status: 'pass',
                evidence: '修订稿改成主角听见审判木裂响、指尖沾到旧印冷灰，用身体动作和视线承接围观者分层反应。',
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
    expect(missingContractFields.note).toContain('pov_depth')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'prose_craft_gap',
        annotation_category: 'prose_craft',
        annotation_key: 'prose_quality:202:12:12:prose_craft_gap:正文工艺',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            prose_craft_checks: [
              {
                key: 'omniscient_crowd_camera',
                label: '远景概括',
                status: 'pass',
                pov_depth: '改用主角听觉、触觉和视线承接场面',
                body_detail: '指尖沾到旧印冷灰，肩背绷住',
                environment_interaction: '审判木裂响和旧印冷灰推动反应',
                action_stillness_balance: '动作推进后用短暂停顿压住局势',
                crowd_reaction_layering: '围观者按友方、敌方、中立长老分层反应',
                evidence: '修订稿改成主角听见审判木裂响、指尖沾到旧印冷灰，用身体动作和视线承接围观者分层反应。',
                fix: '补深度限知、身体细节、环境交互、动静平衡和群众反应分层。',
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
    expect(cleared.note).toContain('正文工艺复检通过')
    expect(cleared.note).toContain('prose_craft_checks')
  })

  test('keeps punctuation tone repair tasks open until punctuation tone checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'punctuation_tone_gap',
        annotation_category: 'punctuation_tone',
        annotation_key: 'prose_quality:202:12:12:punctuation_tone_gap:语气标点',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            punctuation_tone_checks: [
              {
                key: 'ellipsis_dash_pause',
                label: '硬停顿',
                status: 'warn',
                evidence: '执事质问仍连续用“你……你竟然——”制造停顿，爆发句乱用三个感叹号。',
                fix: '改成动作打断、短句承接和人物声线差异。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('语气标点仍未闭环')
    expect(residual.note).toContain('硬停顿')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'punctuation_tone_gap',
        annotation_category: 'punctuation_tone',
        annotation_key: 'prose_quality:202:12:12:punctuation_tone_gap:语气标点',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            punctuation_tone_checks: [
              {
                key: 'ellipsis_dash_pause',
                label: '硬停顿',
                status: 'pass',
                evidence: '修订稿用审判木裂响打断执事质问，短句承接迟疑，爆发只保留一个情绪落点。',
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
        issue_type: 'punctuation_tone_gap',
        annotation_category: 'punctuation_tone',
        annotation_key: 'prose_quality:202:12:12:punctuation_tone_gap:语气标点',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            punctuation_tone_checks: [
              {
                key: 'ellipsis_dash_pause',
                label: '硬停顿',
                status: 'pass',
                speaker: '执事',
                punctuation_issue: '滥用省略号、破折号和连续感叹号',
                tone_intent: '被反证后的慌乱和强行压制',
                replacement: '用审判木裂响打断质问，短句承接迟疑',
                voice_difference: '执事冷硬失控，主角短句克制',
                evidence: '修订稿用审判木裂响打断执事质问，短句承接迟疑，爆发只保留一个情绪落点。',
                fix: '补说话人、标点问题、语气意图、替换方式和声线差异。',
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
    expect(cleared.note).toContain('语气标点复检通过')
    expect(cleared.note).toContain('punctuation_tone_checks')
  })

})
