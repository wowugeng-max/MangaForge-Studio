import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import {
  buildDeliveryRiskRevisionClosurePlan,
  buildRepairTaskRevisionPrompt,
  listQualityContractRequiredFields,
  listQualityContractRequiredFieldKeys,
} from './repairTaskRevisionPrompt'

describe('buildRepairTaskRevisionPrompt specialty', () => {
  function promptQualityContractFields(source: string) {
    const entries = [...source.matchAll(/'([a-z0-9_]+_(?:checks|receipts)) 每项必须包含 ([^。；']+)/g)]
    const contracts = new Map<string, string[]>()
    for (const [, key, fieldsText] of entries) {
      const fields = fieldsText
        .split(',')
        .map(field => field.trim())
        .filter(field => /^[a-z0-9_]+$/.test(field))
      const existing = contracts.get(key)
      if (existing && existing.join(',') !== fields.join(',')) {
        throw new Error(`${key} has conflicting prompt field contracts: ${existing.join(', ')} != ${fields.join(', ')}`)
      }
      contracts.set(key, fields)
    }
    return contracts
  }

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

  test('keeps chapter structure repair tasks open until structure checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'chapter_structure_gap',
        annotation_category: 'chapter_structure',
        annotation_key: 'prose_quality:202:12:12:chapter_structure_gap:章节结构',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            structure_checks: [
              {
                key: 'missing_turning_structure',
                label: '章节结构',
                status: 'warn',
                evidence: '仍缺局势变化和章尾翻页。',
                fix: '补局势变化和新危机。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('章节结构仍未闭环')
    expect(residual.note).toContain('章节结构')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'chapter_structure_gap',
        annotation_category: 'chapter_structure',
        annotation_key: 'prose_quality:202:12:12:chapter_structure_gap:章节结构',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            structure_checks: [
              {
                key: 'missing_turning_structure',
                label: '章节结构',
                status: 'pass',
                evidence: '修订稿已有开头钩子、中段推进、局势变化和章尾翻页。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.note).toContain('章节结构仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('opening_hook')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'chapter_structure_gap',
        annotation_category: 'chapter_structure',
        annotation_key: 'prose_quality:202:12:12:chapter_structure_gap:章节结构',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            structure_checks: [
              {
                key: 'missing_turning_structure',
                label: '章节结构',
                status: 'pass',
                opening_hook: '开篇用阵盘第二道裂纹制造异常和危机。',
                middle_progression: '中段主角用旧印核对阵纹并推动审判转向。',
                situation_change: '长老席从压制转为追查内库阵图。',
                ending_page_turn: '章尾留下内库阵图来源和下一轮追查问题。',
                evidence: '修订稿已有开头钩子、中段推进、局势变化和章尾翻页。',
                fix: '补开头钩子、中段推进、局势变化和章尾翻页。',
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
    expect(cleared.note).toContain('章节结构复检通过')
    expect(cleared.note).toContain('structure_checks')
  })

  test('keeps chapter progression repair tasks open until progression checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'chapter_progression_gap',
        annotation_category: 'chapter_progression',
        annotation_key: 'prose_quality:202:12:12:chapter_progression_gap:章节推进',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            progression_checks: [
              {
                key: 'deletable_chapter',
                label: '章节推进',
                status: 'warn',
                evidence: '删掉这章仍不影响理解。',
                fix: '补本章不可删除的主线变化。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('章节推进仍未闭环')
    expect(residual.note).toContain('章节推进')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'chapter_progression_gap',
        annotation_category: 'chapter_progression',
        annotation_key: 'prose_quality:202:12:12:chapter_progression_gap:章节推进',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            progression_checks: [
              {
                key: 'deletable_chapter',
                label: '章节推进',
                status: 'pass',
                evidence: '修订稿补出不可删除的证据、选择、代价和主线位移。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.note).toContain('章节推进仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('non_deletable_change')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'chapter_progression_gap',
        annotation_category: 'chapter_progression',
        annotation_key: 'prose_quality:202:12:12:chapter_progression_gap:章节推进',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            progression_checks: [
              {
                key: 'deletable_chapter',
                label: '章节推进',
                status: 'pass',
                non_deletable_change: '旧印反证资格让审判结果和后续追查方向改变。',
                mainline_shift: '主线从被审判压制转为追查内库阵图。',
                relationship_or_state_change: '长老席态度从否定转为戒备，主角获得临时资格。',
                compressed_water: '删除不改变理解的过渡说明，把信息并入动作核对。',
                evidence: '修订稿补出不可删除的证据、选择、代价和主线位移。',
                fix: '补不可删除变化、主线位移和关系/状态变化。',
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
    expect(cleared.note).toContain('章节推进复检通过')
    expect(cleared.note).toContain('progression_checks')
  })

  test('keeps information load repair tasks open until information checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'information_load_gap',
        annotation_category: 'information_load',
        annotation_key: 'prose_quality:202:12:12:information_load_gap:信息负载',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            information_checks: [
              {
                key: 'concept_overload',
                label: '信息负载',
                status: 'warn',
                evidence: '信息仍没有跟着冲突走。',
                fix: '把设定说明改成证据核对。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('信息负载仍未闭环')
    expect(residual.note).toContain('信息负载')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'information_load_gap',
        annotation_category: 'information_load',
        annotation_key: 'prose_quality:202:12:12:information_load_gap:信息负载',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            information_checks: [
              {
                key: 'concept_overload',
                label: '信息负载',
                status: 'pass',
                evidence: '修订稿把旧印规则放进质疑、触发、证据核对和冲突反馈里释放。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.note).toContain('信息负载仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('new_concept_count')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'information_load_gap',
        annotation_category: 'information_load',
        annotation_key: 'prose_quality:202:12:12:information_load_gap:信息负载',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            information_checks: [
              {
                key: 'concept_overload',
                label: '信息负载',
                status: 'pass',
                new_concept_count: 2,
                action_bound_info: '旧印规则通过主角触碰阵纹和长老席追问释放。',
                conflict_release: '阵图线索只在审判冲突升级时出现。',
                reader_first_scene: '读者先看到阵纹改色，再理解旧印资格反证规则。',
                evidence: '修订稿把旧印规则放进质疑、触发、证据核对和冲突反馈里释放。',
                fix: '控制新概念数量，并让信息跟冲突和行动走。',
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
    expect(cleared.note).toContain('信息负载复检通过')
    expect(cleared.note).toContain('information_checks')
  })

  test('keeps longform continuity repair tasks open until longform checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'longform_continuity_gap',
        annotation_category: 'longform_continuity',
        annotation_key: 'prose_quality:202:12:12:longform_continuity_gap:长篇连续性',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            longform_checks: [
              {
                key: 'recent_progress_stalled',
                label: '长篇连续性',
                status: 'warn',
                evidence: '最近5章仍没有明确进展。',
                fix: '补阶段位移和爽点间隔。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('长篇连续性仍未闭环')
    expect(residual.note).toContain('长篇连续性')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'longform_continuity_gap',
        annotation_category: 'longform_continuity',
        annotation_key: 'prose_quality:202:12:12:longform_continuity_gap:长篇连续性',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            longform_checks: [
              {
                key: 'recent_progress_stalled',
                label: '长篇连续性',
                status: 'pass',
                evidence: '修订稿补出最近5章阶段位移、爽点间隔和下一阶段目标。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.note).toContain('长篇连续性仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('recent_5_chapter_progress')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'longform_continuity_gap',
        annotation_category: 'longform_continuity',
        annotation_key: 'prose_quality:202:12:12:longform_continuity_gap:长篇连续性',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            longform_checks: [
              {
                key: 'recent_progress_stalled',
                label: '长篇连续性',
                status: 'pass',
                recent_5_chapter_progress: '近5章从被压制推进到拿到临时资格并触发内库阵图追查。',
                payoff_interval: '本章用旧印反证资格补一次明确爽点回报。',
                stage_goal_shift: '阶段目标从自证清白转为追查旧印和内库阵图来源。',
                next_stage_pull: '长老席追查内库阵图牵引下一阶段。',
                context_layer: '承接前章审判压力，并给后续阵图线索保温。',
                evidence: '修订稿补出最近5章阶段位移、爽点间隔和下一阶段目标。',
                fix: '补近5章进展、爽点间隔、阶段目标位移和下一阶段牵引。',
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
    expect(cleared.note).toContain('长篇连续性复检通过')
    expect(cleared.note).toContain('longform_checks')
  })

  test('keeps core contract repair tasks open until core contract checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'core_contract_gap',
        annotation_category: 'core_contract',
        annotation_key: 'prose_quality:202:12:12:core_contract_gap:核心契约',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            core_contract_checks: [
              {
                key: 'theme_unity_rules',
                label: '核心契约',
                status: 'warn',
                evidence: '核心承诺仍没有回到规则反制。',
                fix: '把支线宝物改成规则判定证据。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('核心契约仍未闭环')
    expect(residual.note).toContain('核心契约')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'core_contract_gap',
        annotation_category: 'core_contract',
        annotation_key: 'prose_quality:202:12:12:core_contract_gap:核心契约',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            core_contract_checks: [
              {
                key: 'theme_unity_rules',
                label: '核心契约',
                status: 'pass',
                evidence: '修订稿让主角用规则反制兑现核心承诺，并把章尾问题压回全书核心情绪。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.note).toContain('核心契约仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('core_promise')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'core_contract_gap',
        annotation_category: 'core_contract',
        annotation_key: 'prose_quality:202:12:12:core_contract_gap:核心契约',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            core_contract_checks: [
              {
                key: 'theme_unity_rules',
                label: '核心契约',
                status: 'pass',
                core_promise: '用规则和证据反压不公审判。',
                mainline_service: '旧印和阵图线索都服务主线追查。',
                core_emotion: '被轻视后的尊严回收和规则胜利。',
                rule_judgement: '旧印触发阵纹资格反证，而不是凭空开挂。',
                ending_question: '内库阵图是谁提前动过。',
                evidence: '修订稿让主角用规则反制兑现核心承诺，并把章尾问题压回全书核心情绪。',
                fix: '把支线宝物改成规则判定证据，章尾问题回到核心承诺。',
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
    expect(cleared.note).toContain('核心契约复检通过')
    expect(cleared.note).toContain('core_contract_checks')
  })

  test('keeps continuity heat repair tasks open until continuity heat checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'continuity_heat_gap',
        annotation_category: 'continuity_heat',
        annotation_key: 'prose_quality:202:12:12:continuity_heat_gap:连续性热度',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            continuity_heat_checks: [
              {
                key: 'cold_recall_without_warmup',
                label: '连续性热度',
                status: 'warn',
                evidence: 'cold 伏笔回收前仍没有升温。',
                fix: '先给一处可见升温。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('连续性热度仍未闭环')
    expect(residual.note).toContain('连续性热度')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'continuity_heat_gap',
        annotation_category: 'continuity_heat',
        annotation_key: 'prose_quality:202:12:12:continuity_heat_gap:连续性热度',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            continuity_heat_checks: [
              {
                key: 'cold_recall_without_warmup',
                label: '连续性热度',
                status: 'pass',
                evidence: '修订稿让旧印触发新证据推进，并在 cold 回收前给出可见升温。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.note).toContain('连续性热度仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('heat_state')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'continuity_heat_gap',
        annotation_category: 'continuity_heat',
        annotation_key: 'prose_quality:202:12:12:continuity_heat_gap:连续性热度',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            continuity_heat_checks: [
              {
                key: 'cold_recall_without_warmup',
                label: '连续性热度',
                status: 'pass',
                heat_state: 'cold -> warm',
                hot_progress: '旧印触发新证据推进当前章审判线。',
                warm_keepalive: '内库阵图在章尾保温为下一章追查目标。',
                cold_warmup: '回收旧印前先用阵纹改色给可见升温。',
                archived_boundary: '未触碰 archived 休眠支线。',
                evidence: '修订稿让旧印触发新证据推进，并在 cold 回收前给出可见升温。',
                fix: '先升温 cold 伏笔，再推进当前 hot 线索并保温下一章。',
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
    expect(cleared.note).toContain('连续性热度复检通过')
    expect(cleared.note).toContain('continuity_heat_checks')
  })

  test('keeps revision receipt repair tasks open until revision receipt checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'revision_receipt_gap',
        annotation_category: 'revision_receipt',
        annotation_key: 'prose_quality:202:12:12:revision_receipt_gap:修订回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            revision_receipt_checks: [
              {
                key: 'prose_revision_receipt_sync',
                label: '修订回执',
                status: 'warn',
                evidence: 'revision_receipts 仍缺 changed_evidence。',
                fix: '补 changed_evidence。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('修订回执仍未闭环')
    expect(residual.note).toContain('changed_evidence')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'revision_receipt_gap',
        annotation_category: 'revision_receipt',
        annotation_key: 'prose_quality:202:12:12:revision_receipt_gap:修订回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            revision_receipt_checks: [
              {
                key: 'prose_revision_receipt_sync',
                label: '修订回执',
                status: 'pass',
                evidence: '修订稿逐条补齐 revision_receipts.changed_evidence。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.note).toContain('修订回执仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('required_action')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'revision_receipt_gap',
        annotation_category: 'revision_receipt',
        annotation_key: 'prose_quality:202:12:12:revision_receipt_gap:修订回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            revision_receipt_checks: [
              {
                key: 'prose_revision_receipt_sync',
                label: '修订回执',
                status: 'pass',
                required_action: '补齐 delivery_risk_receipts 对应的修订回执。',
                repair_segment: '第三场旧印对峙段。',
                applied_fix: '补主角用旧印反压长老席的动作和对白。',
                changed_evidence: '“旧印压在案角，长老席第一次退了半步。”',
                evidence: '修订稿逐条补齐 revision_receipts.changed_evidence。',
                fix: '逐条补 required_action、repair_segment、applied_fix 和 changed_evidence。',
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
    expect(cleared.note).toContain('修订回执复检通过')
    expect(cleared.note).toContain('revision_receipt_checks')
  })

  test('keeps deslop repair tasks open until deslop repair checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'deslop_repair_gap',
        annotation_category: 'deslop_repair',
        annotation_key: 'prose_quality:202:12:12:deslop_repair_gap:去AI味修复',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            deslop_repair_checks: [
              {
                key: 'deslop_repair_receipt_sync',
                label: '去AI味修复',
                status: 'warn',
                evidence: 'Gate E 模板化对白仍残留。',
                fix: '重修 Gate E。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('去AI味修复仍未闭环')
    expect(residual.note).toContain('Gate E')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'deslop_repair_gap',
        annotation_category: 'deslop_repair',
        annotation_key: 'prose_quality:202:12:12:deslop_repair_gap:去AI味修复',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            deslop_repair_checks: [
              {
                key: 'deslop_repair_receipt_sync',
                label: '去AI味修复',
                status: 'pass',
                evidence: '修订稿清掉 Gate E 模板化对白。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.note).toContain('去AI味修复仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('gate')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'deslop_repair_gap',
        annotation_category: 'deslop_repair',
        annotation_key: 'prose_quality:202:12:12:deslop_repair_gap:去AI味修复',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            deslop_repair_checks: [
              {
                key: 'deslop_repair_receipt_sync',
                label: '去AI味修复',
                status: 'pass',
                gate: 'Gate E',
                original_risk: '模板化对白和回执证据不足。',
                rewritten_evidence: '角色用半句反问和现场动作替代解释式对白。',
                changed_evidence: '“你敢押这枚旧印？”他把残印往案上一推。',
                receipt_synced: true,
                evidence: '修订稿清掉 Gate E 模板化对白，并补齐 deslop_repair_receipts.changed_evidence。',
                fix: '重写模板化对白并同步 deslop_repair_receipts。',
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
    expect(cleared.note).toContain('去AI味修复复检通过')
    expect(cleared.note).toContain('deslop_repair_checks')
  })

  test('keeps prose meta repair tasks open until prose meta checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'prose_meta_gap',
        annotation_category: 'prose_meta',
        annotation_key: 'prose_quality:202:12:12:prose_meta_gap:正文元叙事',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            prose_meta_checks: [
              {
                key: 'meta_narration_leak',
                label: '正文元叙事',
                status: 'warn',
                evidence: '正文仍出现作者说明。',
                fix: '删除作者说明。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('正文元叙事仍未闭环')
    expect(residual.note).toContain('作者说明')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'prose_meta_gap',
        annotation_category: 'prose_meta',
        annotation_key: 'prose_quality:202:12:12:prose_meta_gap:正文元叙事',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            prose_meta_checks: [
              {
                key: 'meta_narration_leak',
                label: '正文元叙事',
                status: 'pass',
                evidence: '修订稿删除作者说明，全部改成角色现场证据。',
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
    expect(missingContractFields.note).toContain('matched_term')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'prose_meta_gap',
        annotation_category: 'prose_meta',
        annotation_key: 'prose_quality:202:12:12:prose_meta_gap:正文元叙事',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            prose_meta_checks: [
              {
                key: 'meta_narration_leak',
                label: '正文元叙事',
                status: 'pass',
                matched_term: '作者说明',
                location: '第12章第34段',
                replacement: '周远抬手按住裂开的审判木，没有再解释。',
                evidence: '修订稿删除作者说明，全部改成角色现场证据。',
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
    expect(cleared.note).toContain('正文元叙事复检通过')
    expect(cleared.note).toContain('prose_meta_checks')
  })

  test('keeps banned words repair tasks open until banned word checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'banned_words_gap',
        annotation_category: 'banned_words',
        annotation_key: 'prose_quality:202:12:12:banned_words_gap:禁用词',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            banned_words_checks: [
              {
                key: 'level_1_banned_word',
                label: '一级禁用词',
                status: 'warn',
                evidence: '正文仍出现“眼中闪过一丝”。',
                fix: '改成具体动作或对白。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('禁用词扫描仍未闭环')
    expect(residual.note).toContain('一级禁用词')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'banned_words_gap',
        annotation_category: 'banned_words',
        annotation_key: 'prose_quality:202:12:12:banned_words_gap:禁用词',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            banned_words_checks: [
              {
                key: 'level_1_banned_word',
                label: '一级禁用词',
                status: 'pass',
                evidence: '修订稿已替换命中词，复扫为 0。',
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
    expect(missingContractFields.note).toContain('matched_word')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'banned_words_gap',
        annotation_category: 'banned_words',
        annotation_key: 'prose_quality:202:12:12:banned_words_gap:禁用词',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            banned_words_checks: [
              {
                key: 'level_1_banned_word',
                label: '一级禁用词',
                status: 'pass',
                matched_word: '眼中闪过一丝',
                level: 'level_1',
                location: '第12章第18段',
                replacement: '他指节扣紧旧印，没再看执事。',
                evidence: '修订稿已替换命中词，复扫为 0。',
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
    expect(cleared.note).toContain('禁用词扫描复检通过')
    expect(cleared.note).toContain('banned_words_checks')
  })

  test('keeps blueprint consumption repair tasks open until outline checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'blueprint_consumption_gap',
        annotation_category: 'blueprint_consumption',
        annotation_key: 'prose_quality:202:12:12:blueprint_consumption_gap:细纲兑现',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            blueprint_consumption_checks: [
              {
                key: 'character_order_missing',
                label: '人物关系/出场顺序',
                status: 'warn',
                evidence: '盟友改口没有按细纲出现在反证之后。',
                fix: '补出反证后盟友改口的现场对白和旁观反馈。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('细纲兑现仍未闭环')
    expect(residual.note).toContain('人物关系/出场顺序')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'blueprint_consumption_gap',
        annotation_category: 'blueprint_consumption',
        annotation_key: 'prose_quality:202:12:12:blueprint_consumption_gap:细纲兑现',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            blueprint_consumption_checks: [
              {
                key: 'character_order_missing',
                label: '人物关系/出场顺序',
                status: 'pass',
                evidence: '反证后盟友改口已落成对白和旁观反馈。',
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
    expect(missingContractFields.note).toContain('blueprint_field')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'blueprint_consumption_gap',
        annotation_category: 'blueprint_consumption',
        annotation_key: 'prose_quality:202:12:12:blueprint_consumption_gap:细纲兑现',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            blueprint_consumption_checks: [
              {
                key: 'character_order_missing',
                label: '人物关系/出场顺序',
                status: 'pass',
                blueprint_field: 'character_order',
                expected: '反证后盟友改口，并触发旁观者反馈。',
                delivered_evidence: '反证后盟友改口已落成对白和旁观反馈。',
                missing_gap: '无缺口',
                evidence: '反证后盟友改口已落成对白和旁观反馈。',
                fix: '补人物关系/出场顺序的正文兑现证据。',
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
    expect(cleared.note).toContain('细纲兑现复检通过')
    expect(cleared.note).toContain('blueprint_consumption_checks')
  })

  test('keeps foreshadowing delta repair tasks open until clue delta checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'foreshadowing_delta_gap',
        annotation_category: 'foreshadowing_delta',
        annotation_key: 'prose_quality:202:12:12:foreshadowing_delta_gap:伏笔增量',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            foreshadowing_delta_checks: [
              {
                key: 'missing_tracking_entry',
                label: '新增伏笔未登记',
                status: 'warn',
                evidence: '带血腰牌首次出现，但追踪/伏笔.md 没有新增记录。',
                fix: '补齐伏笔台账和 source_excerpt。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('伏笔增量仍未闭环')
    expect(residual.note).toContain('新增伏笔未登记')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'foreshadowing_delta_gap',
        annotation_category: 'foreshadowing_delta',
        annotation_key: 'prose_quality:202:12:12:foreshadowing_delta_gap:伏笔增量',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            foreshadowing_delta_checks: [
              {
                key: 'missing_tracking_entry',
                label: '新增伏笔未登记',
                status: 'pass',
                evidence: '带血腰牌已写入追踪/伏笔.md，并带 source_excerpt。',
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
    expect(missingContractFields.note).toContain('clue_name')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'foreshadowing_delta_gap',
        annotation_category: 'foreshadowing_delta',
        annotation_key: 'prose_quality:202:12:12:foreshadowing_delta_gap:伏笔增量',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            foreshadowing_delta_checks: [
              {
                key: 'missing_tracking_entry',
                label: '新增伏笔未登记',
                status: 'pass',
                clue_name: '带血腰牌',
                delta_type: '新增',
                current_status: '已埋下，未回收',
                chapter: '第12章',
                source_excerpt: '主角在禁门下拾起带血腰牌。',
                ledger_path: '追踪/伏笔.md',
                evidence: '带血腰牌已写入追踪/伏笔.md，并带 source_excerpt。',
                fix: '补伏笔名、增量类型、当前状态、章节、来源摘录和台账路径。',
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
    expect(cleared.note).toContain('伏笔增量复检通过')
    expect(cleared.note).toContain('foreshadowing_delta_checks')
  })

  test('keeps title uniqueness repair tasks open until duplicate titles clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'title_uniqueness_gap',
        annotation_category: 'title_uniqueness',
        annotation_key: 'prose_quality:202:8:8:title_uniqueness_gap:标题去重',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            title_uniqueness_checks: [
              {
                key: 'duplicate_chapter_title',
                label: '重复标题',
                status: 'warn',
                evidence: '第8章《暗门》与第3章标题重复。',
                fix: '按本章核心事件重新命名，并同步细纲标题和正文文件名。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('标题去重仍未闭环')
    expect(residual.note).toContain('重复标题')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'title_uniqueness_gap',
        annotation_category: 'title_uniqueness',
        annotation_key: 'prose_quality:202:8:8:title_uniqueness_gap:标题去重',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            title_uniqueness_checks: [
              {
                key: 'duplicate_chapter_title',
                label: '重复标题',
                status: 'pass',
                evidence: '第8章已改为《湿校牌》，细纲标题和正文文件名同步完成。',
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
    expect(missingContractFields.note).toContain('old_title')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'title_uniqueness_gap',
        annotation_category: 'title_uniqueness',
        annotation_key: 'prose_quality:202:8:8:title_uniqueness_gap:标题去重',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            title_uniqueness_checks: [
              {
                key: 'duplicate_chapter_title',
                label: '重复标题',
                status: 'pass',
                old_title: '暗门',
                new_title: '湿校牌',
                outline_title_synced: true,
                file_name_synced: true,
                chapter_title_line_synced: true,
                evidence: '第8章已改为《湿校牌》，细纲标题和正文文件名同步完成。',
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
    expect(cleared.note).toContain('标题去重复检通过')
    expect(cleared.note).toContain('title_uniqueness_checks')
  })

  test('keeps deterministic cleanup repair tasks open until cleanup risks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'deterministic_cleanup_gap',
        annotation_category: 'deterministic_cleanup',
        annotation_key: 'prose_quality:202:12:12:deterministic_cleanup_gap:确定性清理',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            deterministic_prose_cleanup: {
              status: 'warn',
              risk_count: 2,
              label: '确定性清理残留',
              categories: [
                { label: '长省略号', count: 1, evidence: '“他沉默了……”' },
                { label: '高危 AI 句式', count: 1, evidence: '不是没有可能，而是必须立刻去做。' },
              ],
            },
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('确定性清理仍未闭环')
    expect(residual.note).toContain('确定性清理残留')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'deterministic_cleanup_gap',
        annotation_category: 'deterministic_cleanup',
        annotation_key: 'prose_quality:202:12:12:deterministic_cleanup_gap:确定性清理',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            deterministic_prose_cleanup: {
              status: 'ok',
              risk_count: 0,
              label: '确定性清理通过',
            },
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('确定性清理复检通过')
    expect(cleared.note).toContain('deterministic_prose_cleanup.risk_count 为 0')
  })

  test('keeps serial risk repair tasks open until serial risk repair checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'serial_risk_repair_gap',
        annotation_category: 'serial_risk_repair',
        annotation_key: 'prose_quality:202:12:12:serial_risk_repair_gap:连续风险修复',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            serial_risk_repair_checks: [
              {
                key: 'scene_serial_risk_unrepaired',
                label: '连续风险修复',
                status: 'warn',
                evidence: '场景承接风险仍未补回执。',
                fix: '补 scene_serial_risk_repair_receipt。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('连续风险修复仍未闭环')
    expect(residual.note).toContain('场景承接风险')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'serial_risk_repair_gap',
        annotation_category: 'serial_risk_repair',
        annotation_key: 'prose_quality:202:12:12:serial_risk_repair_gap:连续风险修复',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            serial_risk_repair_checks: [
              {
                key: 'scene_serial_risk_unrepaired',
                label: '连续风险修复',
                status: 'pass',
                evidence: '修订稿补齐连续生产风险修复回执，并让场景承接变化落到正文证据。',
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
    expect(missingContractFields.note).toContain('risk_type')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'serial_risk_repair_gap',
        annotation_category: 'serial_risk_repair',
        annotation_key: 'prose_quality:202:12:12:serial_risk_repair_gap:连续风险修复',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            serial_risk_repair_checks: [
              {
                key: 'scene_serial_risk_unrepaired',
                label: '连续风险修复',
                status: 'pass',
                risk_type: 'scene_continuity',
                repair_receipt: 'scene_serial_risk_repair_receipt 已写入',
                continuity_change: '上一章禁门压力承接到本章验印动作',
                state_change: '主角从被审转为临时追查者',
                evidence: '修订稿补齐连续生产风险修复回执，并让场景承接变化落到正文证据。',
                fix: '补风险类型、修复回执、连续性变化和状态变化。',
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
    expect(cleared.note).toContain('连续风险修复复检通过')
    expect(cleared.note).toContain('serial_risk_repair_checks')
  })

  test('keeps chapter hook quality repair tasks open until chapter hook quality checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'chapter_hook_quality_gap',
        annotation_category: 'chapter_hook_quality',
        annotation_key: 'prose_quality:202:12:12:chapter_hook_quality_gap:章钩质量',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            chapter_hook_quality_checks: [
              {
                key: 'ending_hook_weak_pull',
                label: '章钩质量',
                status: 'warn',
                evidence: '章尾没有下一章行动压力。',
                fix: '补具体未解问题。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('章钩质量仍未闭环')
    expect(residual.note).toContain('下一章行动压力')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'chapter_hook_quality_gap',
        annotation_category: 'chapter_hook_quality',
        annotation_key: 'prose_quality:202:12:12:chapter_hook_quality_gap:章钩质量',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            chapter_hook_quality_checks: [
              {
                key: 'ending_hook_weak_pull',
                label: '章钩质量',
                status: 'pass',
                evidence: '章尾补出具体未解问题，并和下一章行动直接相连。',
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
    expect(missingContractFields.note).toContain('hook_position')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'chapter_hook_quality_gap',
        annotation_category: 'chapter_hook_quality',
        annotation_key: 'prose_quality:202:12:12:chapter_hook_quality_gap:章钩质量',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            chapter_hook_quality_checks: [
              {
                key: 'ending_hook_weak_pull',
                label: '章钩质量',
                status: 'pass',
                hook_position: 'ending',
                trigger_type: 'danger_or_choice',
                concrete_question: '赤炉城供奉为什么和旧钥匙同纹。',
                danger_or_choice: '主角必须在长老席追查前决定是否去赤炉城。',
                next_action_link: '下一章直接进入赤炉城供奉线索追查。',
                evidence: '章尾补出具体未解问题，并和下一章行动直接相连。',
                fix: '补钩子位置、触发类型、具体问题、危险/选择和下一行动链接。',
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
    expect(cleared.note).toContain('章钩质量复检通过')
    expect(cleared.note).toContain('chapter_hook_quality_checks')
  })

  test('keeps quality audit repair receipt tasks open until receipt sync clears', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'quality_audit_repair_receipt',
        annotation_category: 'quality_audit_repair_receipt',
        annotation_key: 'quality_audit_repair_receipt_sync:207:12:12:quality_audit_repair_receipt:质量回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          quality_audit_repair_receipt_sync: {
            status: 'warn',
            missed_count: 1,
            missed: [
              { label: '目的词详略分配', text: 'changed_evidence 为空，无法确认修复后正文证据。' },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('质量诊断修复回执仍未闭环')
    expect(residual.note).toContain('changed_evidence 为空')

    const genericEvidenceResidual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'quality_audit_repair_receipt',
        annotation_category: 'quality_audit_repair_receipt',
        annotation_key: 'quality_audit_repair_receipt_sync:207:12:12:quality_audit_repair_receipt:质量回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          quality_audit_repair_receipt_sync: {
            status: 'ok',
            missed_count: 0,
            receipt_count: 1,
            quality_audit_repair_receipts: [
              {
                key: 'purpose_density',
                label: '目的词详略分配',
                status: 'pass',
                changed_evidence: '已修复。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(genericEvidenceResidual.taskStatus).toBe('needs_review')
    expect(genericEvidenceResidual.annotationStatus).toBe('')
    expect(genericEvidenceResidual.note).toContain('质量诊断修复回执仍未闭环')
    expect(genericEvidenceResidual.note).toContain('证据泛化')

    const completedGenericEvidenceResidual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'quality_audit_repair_receipt',
        annotation_category: 'quality_audit_repair_receipt',
        annotation_key: 'quality_audit_repair_receipt_sync:207:12:12:quality_audit_repair_receipt:质量回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 87,
          quality_audit_repair_receipt_sync: {
            status: 'ok',
            missed_count: 0,
            receipt_count: 1,
            completed: [
              {
                key: 'purpose_density',
                label: '目的词详略分配',
                status: 'pass',
                changed_evidence: '已修复。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(completedGenericEvidenceResidual.taskStatus).toBe('needs_review')
    expect(completedGenericEvidenceResidual.annotationStatus).toBe('')
    expect(completedGenericEvidenceResidual.note).toContain('质量诊断修复回执仍未闭环')
    expect(completedGenericEvidenceResidual.note).toContain('证据泛化')

    const adjustedGenericEvidenceResidual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'quality_audit_repair_receipt',
        annotation_category: 'quality_audit_repair_receipt',
        annotation_key: 'quality_audit_repair_receipt_sync:207:12:12:quality_audit_repair_receipt:质量回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 87,
          quality_audit_repair_receipt_sync: {
            status: 'ok',
            missed_count: 0,
            receipt_count: 1,
            completed: [
              {
                key: 'purpose_density',
                label: '目的词详略分配',
                status: 'pass',
                changed_evidence: '调整完成。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(adjustedGenericEvidenceResidual.taskStatus).toBe('needs_review')
    expect(adjustedGenericEvidenceResidual.annotationStatus).toBe('')
    expect(adjustedGenericEvidenceResidual.note).toContain('质量诊断修复回执仍未闭环')
    expect(adjustedGenericEvidenceResidual.note).toContain('证据泛化')

    const supplementedGenericEvidenceResidual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'quality_audit_repair_receipt',
        annotation_category: 'quality_audit_repair_receipt',
        annotation_key: 'quality_audit_repair_receipt_sync:207:12:12:quality_audit_repair_receipt:质量回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 87,
          quality_audit_repair_receipt_sync: {
            status: 'ok',
            missed_count: 0,
            receipt_count: 1,
            completed: [
              {
                key: 'purpose_density',
                label: '目的词详略分配',
                status: 'pass',
                changed_evidence: '已经补齐。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(supplementedGenericEvidenceResidual.taskStatus).toBe('needs_review')
    expect(supplementedGenericEvidenceResidual.annotationStatus).toBe('')
    expect(supplementedGenericEvidenceResidual.note).toContain('质量诊断修复回执仍未闭环')
    expect(supplementedGenericEvidenceResidual.note).toContain('证据泛化')

    const vagueRevisedProseEvidenceResidual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'quality_audit_repair_receipt',
        annotation_category: 'quality_audit_repair_receipt',
        annotation_key: 'quality_audit_repair_receipt_sync:207:12:12:quality_audit_repair_receipt:质量回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 87,
          quality_audit_repair_receipt_sync: {
            status: 'ok',
            missed_count: 0,
            receipt_count: 1,
            completed: [
              {
                key: 'purpose_density',
                label: '目的词详略分配',
                status: 'pass',
                changed_evidence: '见修订稿。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(vagueRevisedProseEvidenceResidual.taskStatus).toBe('needs_review')
    expect(vagueRevisedProseEvidenceResidual.annotationStatus).toBe('')
    expect(vagueRevisedProseEvidenceResidual.note).toContain('质量诊断修复回执仍未闭环')
    expect(vagueRevisedProseEvidenceResidual.note).toContain('证据泛化')

    const keyedMissingChangedEvidenceResidual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'quality_audit_repair_receipt',
        annotation_category: 'quality_audit_repair_receipt',
        annotation_key: 'quality_audit_repair_receipt_sync:207:12:12:quality_audit_repair_receipt:质量回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 87,
          quality_audit_repair_receipt_sync: {
            status: 'ok',
            missed_count: 0,
            receipt_count: 1,
            completed: [
              {
                key: 'purpose_density',
                label: '目的词详略分配',
                status: 'pass',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(keyedMissingChangedEvidenceResidual.taskStatus).toBe('needs_review')
    expect(keyedMissingChangedEvidenceResidual.annotationStatus).toBe('')
    expect(keyedMissingChangedEvidenceResidual.note).toContain('质量诊断修复回执仍未闭环')
    expect(keyedMissingChangedEvidenceResidual.note).toContain('缺少 changed_evidence')

    const labeledMissingChangedEvidenceResidual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'quality_audit_repair_receipt',
        annotation_category: 'quality_audit_repair_receipt',
        annotation_key: 'quality_audit_repair_receipt_sync:207:12:12:quality_audit_repair_receipt:质量回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 87,
          quality_audit_repair_receipt_sync: {
            status: 'ok',
            missed_count: 0,
            receipt_count: 1,
            completed: [
              {
                label: '目的词详略分配',
                status: 'pass',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(labeledMissingChangedEvidenceResidual.taskStatus).toBe('needs_review')
    expect(labeledMissingChangedEvidenceResidual.annotationStatus).toBe('')
    expect(labeledMissingChangedEvidenceResidual.note).toContain('质量诊断修复回执仍未闭环')
    expect(labeledMissingChangedEvidenceResidual.note).toContain('缺少 changed_evidence')

    const missingChangedEvidenceResidual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'quality_audit_repair_receipt',
        annotation_category: 'quality_audit_repair_receipt',
        annotation_key: 'quality_audit_repair_receipt_sync:207:12:12:quality_audit_repair_receipt:质量回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 87,
          quality_audit_repair_receipt_sync: {
            status: 'ok',
            missed_count: 0,
            receipt_count: 1,
            completed: [
              {
                key: 'purpose_density',
                label: '目的词详略分配',
                status: 'pass',
                original_evidence: '删掉这段不影响章节推进。',
                applied_fix: '补出旧证触发守军换防。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingChangedEvidenceResidual.taskStatus).toBe('needs_review')
    expect(missingChangedEvidenceResidual.annotationStatus).toBe('')
    expect(missingChangedEvidenceResidual.note).toContain('质量诊断修复回执仍未闭环')
    expect(missingChangedEvidenceResidual.note).toContain('缺少 changed_evidence')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'quality_audit_repair_receipt',
        annotation_category: 'quality_audit_repair_receipt',
        annotation_key: 'quality_audit_repair_receipt_sync:207:12:12:quality_audit_repair_receipt:质量回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          quality_audit_repair_receipt_sync: {
            status: 'ok',
            missed_count: 0,
            receipt_count: 2,
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('质量诊断修复回执复检通过')
    expect(cleared.note).toContain('quality_audit_repair_receipt_sync')
  })

  test('keeps deslop repair receipt tasks open until receipt sync clears', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'deslop_repair_receipt',
        annotation_category: 'deslop_repair_receipt',
        annotation_key: 'deslop_repair_receipt_sync:208:12:12:deslop_repair_receipt:去AI味回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          deslop_repair_receipt_sync: {
            status: 'warn',
            missed_count: 1,
            missed: [
              { label: 'Gate B 句式套路', text: 'changed_evidence 为空，无法证明连续主语问题已修。' },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('去AI味修复回执仍未闭环')
    expect(residual.note).toContain('连续主语问题')

    const lateMissingChangedEvidence = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'deslop_repair_receipt',
        annotation_category: 'deslop_repair_receipt',
        annotation_key: 'deslop_repair_receipt_sync:208:12:12:deslop_repair_receipt:去AI味回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          deslop_repair_receipt_sync: {
            status: 'ok',
            missed_count: 0,
            receipt_count: 7,
            completed: [
              {
                gate: 'Gate A',
                label: '抽象情绪',
                original_evidence: '他心中五味杂陈。',
                applied_fix: '改成手指抠住门框。',
                changed_evidence: '他把指节抠进门框裂缝，木刺扎出血点。',
                remaining_risk: '',
              },
              {
                gate: 'Gate B',
                label: '连续主语',
                original_evidence: '他走到门口，他回头看。',
                applied_fix: '压成动作链。',
                changed_evidence: '他走到门口，回头把账册抛给林青禾。',
                remaining_risk: '',
              },
              {
                gate: 'Gate C',
                label: '解释腔',
                original_evidence: '这说明他们已经没有退路。',
                applied_fix: '改成外部压力。',
                changed_evidence: '城门闩咔哒落下，退路被铁链封死。',
                remaining_risk: '',
              },
              {
                gate: 'Gate D',
                label: '空泛形容',
                original_evidence: '气氛十分紧张。',
                applied_fix: '改成具体感官。',
                changed_evidence: '火油味从门缝灌进来，三个人同时按住刀柄。',
                remaining_risk: '',
              },
              {
                gate: 'Gate E',
                label: '对白模板',
                original_evidence: '你真的明白了吗。',
                applied_fix: '改成带交易压力的对白。',
                changed_evidence: '林青禾压低声音：“账册给我，门外那队人归你。”',
                remaining_risk: '',
              },
              {
                gate: 'Gate F',
                label: '总结升华',
                original_evidence: '他终于懂得承担。',
                applied_fix: '改成代价动作。',
                changed_evidence: '他把腰牌塞进火盆，任凭旧姓在铜面上烧黑。',
                remaining_risk: '',
              },
              {
                gate: 'Gate G',
                label: '章末泄力',
                original_evidence: '他们终于安全了。',
                applied_fix: '改成新压力。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(lateMissingChangedEvidence.taskStatus).toBe('needs_review')
    expect(lateMissingChangedEvidence.annotationStatus).toBe('')
    expect(lateMissingChangedEvidence.note).toContain('去AI味修复回执仍未闭环')
    expect(lateMissingChangedEvidence.note).toContain('缺少 changed_evidence')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'deslop_repair_receipt',
        annotation_category: 'deslop_repair_receipt',
        annotation_key: 'deslop_repair_receipt_sync:208:12:12:deslop_repair_receipt:去AI味回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          deslop_repair_receipt_sync: {
            status: 'ok',
            missed_count: 0,
            receipt_count: 2,
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('去AI味修复回执复检通过')
    expect(cleared.note).toContain('deslop_repair_receipt_sync')
  })

  test('keeps revision cascade and scope guard tasks open until sync clears', () => {
    const contextResidual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'revision_context_receipts_sync',
        annotation_category: 'revision_context_receipts',
        annotation_key: 'revision_context_receipts_sync:212:12:12:revision_context_receipts:修订上下文',
        action: '补齐 revision_context_receipts 中 status=warn/fail 或 remaining_risk 非空的上下文差异。',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          revision_context_receipts_sync: {
            status: 'warn',
            missed_count: 1,
            missed: [
              {
                label: '时间线核对',
                evidence: '上一章禁门仍未开启，但修订后直接进入门后。',
                fix: '补出禁门开启动作，或把门后信息推迟到下一章。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(contextResidual.taskStatus).toBe('needs_review')
    expect(contextResidual.annotationStatus).toBe('')
    expect(contextResidual.note).toContain('修订上下文仍未闭环')
    expect(contextResidual.note).toContain('上一章禁门仍未开启')

    const missingSourceEvidenceResidual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'revision_context_receipts_sync',
        annotation_category: 'revision_context_receipts',
        annotation_key: 'revision_context_receipts_sync:212:12:12:revision_context_receipts:修订上下文',
        action: '补齐 revision_context_receipts 中 status=warn/fail 或 remaining_risk 非空的上下文差异。',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          revision_context_receipts_sync: {
            status: 'ok',
            missed_count: 0,
            receipt_count: 1,
            completed: [
              {
                key: 'timeline',
                label: '时间线',
                status: 'pass',
                fix: '已核对时间线一致。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingSourceEvidenceResidual.taskStatus).toBe('needs_review')
    expect(missingSourceEvidenceResidual.annotationStatus).toBe('')
    expect(missingSourceEvidenceResidual.note).toContain('修订上下文仍未闭环')
    expect(missingSourceEvidenceResidual.note).toContain('缺少 evidence/source_excerpt')

    const missingSourceExcerptResidual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'revision_context_receipts_sync',
        annotation_category: 'revision_context_receipts',
        annotation_key: 'revision_context_receipts_sync:212:12:12:revision_context_receipts:修订上下文',
        action: '补齐 revision_context_receipts 中 status=warn/fail 或 remaining_risk 非空的上下文差异。',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          revision_context_receipts_sync: {
            status: 'ok',
            missed_count: 0,
            receipt_count: 1,
            completed: [
              {
                key: 'timeline',
                label: '时间线',
                status: 'pass',
                evidence: '审判庭复核仍发生在同日夜间。',
                fix: '无需修订，时间线一致。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingSourceExcerptResidual.taskStatus).toBe('needs_review')
    expect(missingSourceExcerptResidual.annotationStatus).toBe('')
    expect(missingSourceExcerptResidual.note).toContain('修订上下文仍未闭环')
    expect(missingSourceExcerptResidual.note).toContain('缺少 source_excerpt')

    const contextCleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'revision_context_receipts_sync',
        annotation_category: 'revision_context_receipts',
        annotation_key: 'revision_context_receipts_sync:212:12:12:revision_context_receipts:修订上下文',
        action: '补齐 revision_context_receipts 中 status=warn/fail 或 remaining_risk 非空的上下文差异。',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          revision_context_receipts_sync: {
            status: 'ok',
            missed_count: 0,
            receipt_count: 8,
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(contextCleared.taskStatus).toBe('resolved')
    expect(contextCleared.annotationStatus).toBe('resolved')
    expect(contextCleared.note).toContain('修订上下文复检通过')
    expect(contextCleared.note).toContain('revision_context_receipts_sync')

    const cascadeResidual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'revision_cascade_impact',
        annotation_category: 'revision_cascade_impact',
        annotation_key: 'revision_cascade_impact_sync:209:12:12:revision_cascade_impact:级联修订',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          revision_cascade_impact_sync: {
            status: 'warn',
            missed_count: 1,
            missed: [
              { target: '令牌背面血字', text: '令牌状态改变会影响第13章开篇交接。' },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cascadeResidual.taskStatus).toBe('needs_review')
    expect(cascadeResidual.annotationStatus).toBe('')
    expect(cascadeResidual.note).toContain('修订级联影响仍未闭环')
    expect(cascadeResidual.note).toContain('令牌状态改变')

    const scopeCleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'revision_scope_guard',
        annotation_category: 'revision_scope_guard',
        annotation_key: 'revision_scope_guard_sync:210:12:12:revision_scope_guard:修订幅度',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          revision_scope_guard_sync: {
            status: 'ok',
            missed_count: 0,
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(scopeCleared.taskStatus).toBe('resolved')
    expect(scopeCleared.annotationStatus).toBe('resolved')
    expect(scopeCleared.note).toContain('修订幅度复检通过')
    expect(scopeCleared.note).toContain('revision_scope_guard_sync')
  })

  test('keeps prose revision receipt sync tasks open until revision receipts close delivery risks', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'prose_revision_receipt_sync',
        annotation_category: 'prose_revision_receipt',
        annotation_key: 'prose_revision_receipt_sync:211:12:12:prose_revision_receipt:修订回执',
        action: '补齐 delivery_risk_receipts 对应的 revision_receipts。',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          prose_revision_receipt_sync: {
            status: 'warn',
            missed_count: 1,
            missed: [
              { category: 'delivery_risk_receipt', text: '最后300字没有形成追读钩子。', repair_segment: 'ending_actions' },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('修订回执仍未闭环')
    expect(residual.note).toContain('最后300字没有形成追读钩子')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'prose_revision_receipt_sync',
        annotation_category: 'prose_revision_receipt',
        annotation_key: 'prose_revision_receipt_sync:211:12:12:prose_revision_receipt:修订回执',
        action: '补齐 delivery_risk_receipts 对应的 revision_receipts。',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          prose_revision_receipt_sync: {
            status: 'ok',
            missed_count: 0,
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('修订回执复检通过')
    expect(cleared.note).toContain('prose_revision_receipt_sync')
  })

  test('closes approval blocker tasks when the blocker clears even if other delivery risks remain', () => {
    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'approval_blocker',
        annotation_category: 'approval_blocker',
        annotation_key: 'prose_quality:21:3:approval_blocker:仿写安全阻断',
        payload: {
          type: 'reference_safety_blocked',
          label: '仿写安全阻断',
          detail: '门槛测试与参考样章连续三拍相似',
        },
      },
      {
        quality_refresh: { ok: true, score: 82 },
        delivery_risk_convergence: {
          status: 'improved',
          residual_count: 2,
          label: '风险收敛 1',
          before: {
            total_count: 3,
            approval_blocker: { type: 'reference_safety_blocked', label: '仿写安全阻断' },
          },
          after: {
            total_count: 2,
            approval_blocker: null,
            items: ['守核心：核心偏移 1', '补追读：漏追读 1'],
          },
        },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.annotationKey).toBe('prose_quality:21:3:approval_blocker:仿写安全阻断')
    expect(cleared.note).toContain('入库阻断已解除')
    expect(cleared.note).toContain('仍有其他交稿风险 2 项')

    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'approval_blocker',
        annotation_category: 'approval_blocker',
        annotation_key: 'prose_quality:21:3:approval_blocker:仿写安全阻断',
        payload: {
          type: 'reference_safety_blocked',
          label: '仿写安全阻断',
        },
      },
      {
        quality_refresh: { ok: true, score: 78 },
        delivery_risk_convergence: {
          status: 'unchanged',
          residual_count: 3,
          label: '仍有残留 3',
          after: {
            total_count: 3,
            approval_blocker: { type: 'reference_safety_blocked', label: '仿写安全阻断' },
          },
        },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('入库阻断仍未解除')
  })

  test('closes recovery evidence mismatch tasks after recovery evidence recheck clears', () => {
    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'recovery_evidence_mismatch',
      },
      {
        quality_refresh: { ok: true, score: 84 },
        recovery_evidence_review: {
          status: 'ok',
          failed_evidence: [],
          summary: '恢复放行依据已被本批交稿复盘接住。',
        },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.note).toContain('恢复依据复检通过')
    expect(cleared.note).toContain('failed_evidence 已清空')

    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'recovery_evidence_mismatch',
      },
      {
        quality_refresh: { ok: true, score: 81 },
        recovery_evidence_review: {
          status: 'warn',
          failed_evidence: ['第42章样章已重审'],
          summary: '恢复放行依据 1 项未被本批交稿兑现。',
        },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('恢复依据仍有失效项')
    expect(residual.note).toContain('第42章样章已重审')
  })

  test('uses governance recheck closure wording for single-chapter recovery evidence repairs', () => {
    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'recovery_evidence_mismatch',
        annotation_source: 'governance_recheck_sync',
      },
      {
        quality_refresh: { ok: true, score: 86 },
        recovery_evidence_review: {
          status: 'ok',
          failed_evidence: [],
          summary: '单章治理复查已接住修后证据。',
        },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.note).toContain('单章治理复查通过')
    expect(cleared.note).toContain('governance_recheck_sync')

    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'recovery_evidence_mismatch',
        annotation_source: 'governance_recheck_sync',
      },
      {
        quality_refresh: { ok: true, score: 82 },
        recovery_evidence_review: {
          status: 'warn',
          failed_evidence: ['第42章对白交锋仍未形成可见反制'],
          summary: '恢复依据缺口 1',
        },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('单章恢复依据仍有失效项')
    expect(residual.note).toContain('第42章对白交锋仍未形成可见反制')
  })

  test('closes storyline decision tasks only after storyline sync recheck clears', () => {
    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'storyline_diff_decision',
        decision_key: 'storyline_diff:7:201:missed:执事压迫升级没有兑现。',
        decision: 'revise_prose',
      },
      {
        quality_refresh: { ok: true, score: 83 },
        story_state_update: {
          storyline_sync: {
            status: 'ok',
            missed: [],
            unplanned: [],
            forbidden_touched: [],
          },
        },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('')
    expect(cleared.note).toContain('剧情线决策复检通过')
    expect(cleared.note).toContain('storyline_diff:7:201:missed')

    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'storyline_diff_decision',
        decision_key: 'storyline_diff:7:202:unplanned:正文提前让阵盘指向宗门旧案。',
        decision: 'accept_as_plan',
      },
      {
        quality_refresh: { ok: true, score: 86 },
        story_state_update: {
          storyline_sync: {
            status: 'warn',
            unplanned: [{ name: '残缺阵盘伏笔', reason: '计划仍未承接' }],
            missed: [],
            forbidden_touched: [],
          },
        },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('剧情线仍有差异')
    expect(residual.note).toContain('额外推进 1')
  })
})
