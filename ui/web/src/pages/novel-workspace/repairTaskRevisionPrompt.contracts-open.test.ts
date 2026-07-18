import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import {
  buildDeliveryRiskRevisionClosurePlan,
  buildRepairTaskRevisionPrompt,
  listQualityContractRequiredFields,
  listQualityContractRequiredFieldKeys,
} from './repairTaskRevisionPrompt'

describe('buildRepairTaskRevisionPrompt contracts/open-until-clear', () => {
  test('injects chapter hook quality evidence for page-turn repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'chapter_hook_quality_gap',
      annotation_category: 'chapter_hook_quality',
      message: '章钩质量存在缺口。',
      action: '按 chapter_hook_quality_checks 回修正文。',
      chapter_hook_quality_sync: {
        label: '章钩质量缺口 1',
        missed: [
          {
            label: '章钩质量',
            text: '章尾只写“新的麻烦来了”，没有具体问题、危险、选择或下一章行动压力。',
            fix: '把章尾改成可追读的具体未解问题，并和下一章行动直接相连。',
          },
        ],
        next_actions: ['章首和章尾都必须有现场触发的翻页压力。'],
      },
    })

    expect(prompt).toContain('【章钩质量修复】')
    expect(prompt).toContain('章钩质量缺口 1')
    expect(prompt).toContain('章钩质量：章尾只写“新的麻烦来了”')
    expect(prompt).toContain('下一章行动压力')
    expect(prompt).toContain('现场触发')
    expect(prompt).toContain('输出要求：必须返回 chapter_hook_quality_checks')
    expect(prompt).toContain('chapter_hook_quality_checks 每项必须包含 key, label, status, hook_position, trigger_type, concrete_question, danger_or_choice, next_action_link, evidence, fix, remaining_risk')
    expect(prompt).toContain('章首/章尾没有具体问题、危险/选择、下一章行动连接或正文证据时 status 不能写 pass/ok')
    expect(prompt).toContain('chapter_hook_quality_checks')
  })

  test('keeps failed delivery risk receipts tied to their required repair segment', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'review_annotation_risk',
      issue_type: 'delivery_risk_receipts',
      severity: 'high',
      source_label: '交稿风险回执',
      payload: {
        delivery_risk_receipts: [
          {
            risk_item: '章末翻页风险',
            required_action: '章末把带血腰牌变成新的未解问题。',
            segment: 'ending',
            delivered: false,
            evidence: '最后一段只写众人沉默。',
            remaining_risk: '最后300字没有形成追读钩子。',
          },
          {
            risk_item: '开篇承接风险',
            required_action: '前300字先写主角看到腰牌后的直接反应。',
            delivered: false,
            remaining_risk: '开篇没有承接上一章最后一幕。',
          },
        ],
      },
    })

    expect(prompt).toContain('【分段交稿风险回执修复】')
    expect(prompt).toContain('章末承接修复：章末把带血腰牌变成新的未解问题。')
    expect(prompt).toContain('必须修到最后300字')
    expect(prompt).toContain('不得把章末风险挪到开篇或中段')
    expect(prompt).toContain('开篇承接修复：前300字先写主角看到腰牌后的直接反应。')
    expect(prompt).toContain('必须修到前300字')
  })

  test('injects reader expectation ledger repair rules for expectation debts', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'review_annotation_risk',
      issue_type: 'reader_expectation_debt',
      severity: 'medium',
      source_label: '读者期待',
      annotation_category: 'reader_expectation',
      annotation_key: 'reader_expectation_sync:303:18:18:reader_expectation_debt:期待欠账 1',
      message: '章末追读没有兑现：湿漉漉学生敲响玻璃门。',
      action: '补齐读者期待账本中的必兑现项。',
      payload: {
        status: 'warn',
        missed: [{ label: '章末追读', text: '湿漉漉学生敲响玻璃门' }],
        keep_alive: [{ label: '保留悬念', text: '广播是谁发出的' }],
      },
    })

    expect(prompt).toContain('风险来源：读者期待')
    expect(prompt).toContain('补齐读者期待账本中的必兑现项')
    expect(prompt).toContain('把承诺写成可见行动、冲突结果、情绪回报或章末未解问题')
    expect(prompt).toContain('keep_alive 中的悬念可以继续保留')
  })

  test('keeps scene-card receipt tasks open until receipt recheck clears', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'scene_card_receipt_2_undelivered',
        annotation_key: 'prose_quality:202:12:12:scene_card_receipt:场景卡回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 82,
          review: {
            issues: [
              'fail｜场景卡回执证据复核｜场景2｜scene_card_receipt_2_undelivered｜字段：目标/阻碍/状态变化',
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('场景卡回执仍未闭环')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'scene_card_receipt_2_undelivered',
        annotation_key: 'prose_quality:202:12:12:scene_card_receipt:场景卡回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: { issues: ['ok｜正文工艺｜已通过'] },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('场景卡回执复检通过')
  })

  test('keeps scene-card directive tasks open until execution checks clear', () => {
    const task = {
      source: 'review_annotation_risk',
      issue_type: 'scene_card_1_forbidden_directives',
      annotation_key: 'prose_quality:202:12:12:scene_card_1_forbidden_directives:场景卡禁令执行',
      message: '场景1《蓝晶灼手》违反场景卡禁令：不得用整段来历/等级解释蓝晶。',
      action: '删掉说明书式来历、原理和等级解释，改成角色当下动作反应、对话半句、物理后果或证据判断变化。',
    }

    const residual = buildDeliveryRiskRevisionClosurePlan(task, {
      quality_refresh: {
        ok: true,
        score: 84,
        review: {
          prose_craft_checks: [
            {
              key: 'scene_card_1_forbidden_directives',
              label: '场景卡禁令执行',
              status: 'fail',
              evidence: '场景1仍有整段来历/等级解释。',
            },
          ],
        },
      },
      delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
    })

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('场景卡执行禁令仍未闭环')
    expect(residual.note).toContain('场景卡禁令执行')

    const cleared = buildDeliveryRiskRevisionClosurePlan(task, {
      quality_refresh: {
        ok: true,
        score: 88,
        review: {
          prose_craft_checks: [
            {
              key: 'scene_card_1_forbidden_directives',
              label: '场景卡禁令执行',
              status: 'ok',
            },
          ],
          scene_card_receipts: [
            {
              scene_no: 1,
              delivered: true,
              concept_anchor_rules_delivered: true,
              prose_craft_directives_delivered: true,
              evidence: '蓝晶烫得主角缩手，配角半句点破规则，墙面留下裂纹。',
            },
          ],
        },
      },
      delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
    })

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('场景卡执行禁令复检通过')
  })

  test('keeps quality audit tasks open until matching audit checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'purpose_tag_density_gap',
        annotation_category: 'quality_audit',
        annotation_key: 'prose_quality:202:12:12:purpose_tag_density_gap:质量诊断缺口 1',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            quality_audit_checks: [
              {
                key: 'purpose_tag_density_gap',
                label: '目的词详略分配',
                status: 'fail',
                evidence: '爽点场景仍然只用一句摘要带过。',
                fix: '继续按目的词重排详略。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('质量诊断仍未闭环')
    expect(residual.note).toContain('目的词详略分配')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'purpose_tag_density_gap',
        annotation_category: 'quality_audit',
        annotation_key: 'prose_quality:202:12:12:purpose_tag_density_gap:质量诊断缺口 1',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            quality_audit_checks: [
              { key: 'purpose_tag_density_gap', label: '目的词详略分配', status: 'pass' },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('质量诊断仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('strategy')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'purpose_tag_density_gap',
        annotation_category: 'quality_audit',
        annotation_key: 'prose_quality:202:12:12:purpose_tag_density_gap:质量诊断缺口 1',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            quality_audit_checks: [
              {
                key: 'purpose_tag_density_gap',
                label: '目的词详略分配',
                status: 'pass',
                strategy: 'rewrite',
                purpose_tag: '爽点展开',
                density_change: '爽点场景由一句摘要扩成动作、对白、余波三拍。',
                conflict_bound_info: '信息只跟旧印审判冲突释放。',
                changed_evidence: '“旧印压住案角，长老席第一次退了半步。”',
                fix: '按目的词重排详略。',
                remaining_risk: '',
              },
              {
                key: 'information_flow',
                label: '信息传递',
                status: 'pass',
                strategy: 'compress',
                purpose_tag: '信息跟冲突走',
                density_change: '压缩过渡说明，把阵图线索放进对峙动作。',
                conflict_bound_info: '阵图信息随长老席追问暴露。',
                changed_evidence: '“他只露出半枚残印，长老席立刻追问内库阵图。”',
                fix: '压缩说明，绑定冲突释放。',
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
    expect(cleared.note).toContain('质量诊断复检通过')
    expect(cleared.note).toContain('quality_audit_checks')
  })

  test('keeps pre-draft execution repair tasks open until nested receipts clear', () => {
    const intentResidual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'intent_confirmation_gap',
        annotation_category: 'intent_confirmation',
        annotation_key: 'prose_quality:202:12:12:intent_confirmation_gap:意图确认',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                intent_confirmation_checks: [
                  {
                    label: '情绪目标',
                    delivered: false,
                    remaining_risk: '压迫后的反制情绪没有落到正文。',
                  },
                ],
              },
            },
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(intentResidual.taskStatus).toBe('needs_review')
    expect(intentResidual.annotationStatus).toBe('')
    expect(intentResidual.note).toContain('写前执行回执仍未闭环')
    expect(intentResidual.note).toContain('压迫后的反制情绪没有落到正文')

    const intentMissingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'intent_confirmation_gap',
        annotation_category: 'intent_confirmation',
        annotation_key: 'prose_quality:202:12:12:intent_confirmation_gap:意图确认',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                intent_confirmation_checks: [
                  {
                    label: '情绪目标',
                    delivered: true,
                    status: 'pass',
                    evidence: '正文已落地压迫后的当场反制。',
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

    expect(intentMissingContractFields.taskStatus).toBe('needs_review')
    expect(intentMissingContractFields.annotationStatus).toBe('')
    expect(intentMissingContractFields.note).toContain('缺少字段')
    expect(intentMissingContractFields.note).toContain('intent_field')

    const intentGenericEvidence = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'intent_confirmation_gap',
        annotation_category: 'intent_confirmation',
        annotation_key: 'prose_quality:202:12:12:intent_confirmation_gap:意图确认',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                intent_confirmation_checks: [
                  {
                    key: 'emotion_goal',
                    label: '情绪目标',
                    delivered: true,
                    status: 'pass',
                    intent_field: 'emotion_goal',
                    expected_intent: '压迫后当场反制，给读者尊严爽感。',
                    delivered_evidence: '已完成。',
                    blueprint_link: 'blueprint.emotion_goal',
                    evidence: '已完成。',
                    fix: '已处理。',
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

    expect(intentGenericEvidence.taskStatus).toBe('needs_review')
    expect(intentGenericEvidence.annotationStatus).toBe('')
    expect(intentGenericEvidence.note).toContain('证据泛化')

    const intentCleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'intent_confirmation_gap',
        annotation_category: 'intent_confirmation',
        annotation_key: 'prose_quality:202:12:12:intent_confirmation_gap:意图确认',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                intent_confirmation_checks: [
                  {
                    key: 'emotion_goal',
                    label: '情绪目标',
                    delivered: true,
                    status: 'pass',
                    intent_field: 'emotion_goal',
                    expected_intent: '压迫后当场反制，给读者尊严爽感。',
                    delivered_evidence: '主角用旧印当场反压审判阵纹。',
                    blueprint_link: 'blueprint.emotion_goal',
                    evidence: '正文已落地压迫后的当场反制。',
                    fix: '补情绪目标、预期意图、交付证据和蓝图链接。',
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

    expect(intentCleared.taskStatus).toBe('resolved')
    expect(intentCleared.annotationStatus).toBe('resolved')
    expect(intentCleared.note).toContain('intent_confirmation_checks')

    const statusFilterMissingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'status_filter_receipts_gap',
        annotation_category: 'status_filter',
        annotation_key: 'prose_quality:202:12:12:status_filter_receipts_gap:状态筛选',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                status_filter_receipts: [
                  {
                    key: 'role_state',
                    label: '角色状态',
                    delivered: true,
                    status: 'pass',
                  },
                ],
              },
            },
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(statusFilterMissingContractFields.taskStatus).toBe('needs_review')
    expect(statusFilterMissingContractFields.annotationStatus).toBe('')
    expect(statusFilterMissingContractFields.note).toContain('缺少字段')
    expect(statusFilterMissingContractFields.note).toContain('used_in_chapter')

    const statusFilterGenericExcludedReason = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'status_filter_receipts_gap',
        annotation_category: 'status_filter',
        annotation_key: 'prose_quality:202:12:12:status_filter_receipts_gap:状态筛选',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                status_filter_receipts: [
                  {
                    key: 'outer_city_rule',
                    label: '外城禁令',
                    delivered: true,
                    status: 'pass',
                    used_in_chapter: false,
                    evidence: '外城禁令只影响城门场景，本章全程发生在阵堂内。',
                    excluded_reason: '已核对。',
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

    expect(statusFilterGenericExcludedReason.taskStatus).toBe('needs_review')
    expect(statusFilterGenericExcludedReason.annotationStatus).toBe('')
    expect(statusFilterGenericExcludedReason.note).toContain('写前执行回执')
    expect(statusFilterGenericExcludedReason.note).toContain('证据泛化')

    const statusFilterCleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'status_filter_receipts_gap',
        annotation_category: 'status_filter',
        annotation_key: 'prose_quality:202:12:12:status_filter_receipts_gap:状态筛选',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                status_filter_receipts: [
                  {
                    key: 'role_state',
                    label: '角色状态',
                    delivered: true,
                    status: 'pass',
                    used_in_chapter: true,
                    evidence: '谢怀安手背血纹在禁门前亮起，确认当前章仍受旧印代价约束。',
                    excluded_reason: '已用于本章，未排除。',
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

    expect(statusFilterCleared.taskStatus).toBe('resolved')
    expect(statusFilterCleared.annotationStatus).toBe('resolved')
    expect(statusFilterCleared.note).toContain('status_filter_receipts')

    const qualityPlanReceiptMissingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'next_chapter_quality_plan_receipts_gap',
        annotation_category: 'next_chapter_quality_plan',
        annotation_key: 'prose_quality:202:13:13:next_chapter_quality_plan_receipts_gap:质量续航回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                next_chapter_quality_plan_receipts: [
                  {
                    key: 'opening_actions',
                    label: '开篇动作',
                    delivered: true,
                  },
                ],
              },
            },
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(qualityPlanReceiptMissingContractFields.taskStatus).toBe('needs_review')
    expect(qualityPlanReceiptMissingContractFields.annotationStatus).toBe('')
    expect(qualityPlanReceiptMissingContractFields.note).toContain('缺少字段')
    expect(qualityPlanReceiptMissingContractFields.note).toContain('evidence')

    const qualityPlanReceiptCleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'next_chapter_quality_plan_receipts_gap',
        annotation_category: 'next_chapter_quality_plan',
        annotation_key: 'prose_quality:202:13:13:next_chapter_quality_plan_receipts_gap:质量续航回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                next_chapter_quality_plan_receipts: [
                  {
                    key: 'opening_actions',
                    label: '开篇动作',
                    delivered: true,
                    evidence: '第13章前300字承接审判余波，主角先处理旧印反噬再进入新冲突。',
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

    expect(qualityPlanReceiptCleared.taskStatus).toBe('resolved')
    expect(qualityPlanReceiptCleared.annotationStatus).toBe('resolved')
    expect(qualityPlanReceiptCleared.note).toContain('next_chapter_quality_plan_receipts')

    const recallMissingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'benchmark_recall_gap',
        annotation_category: 'benchmark_recall',
        annotation_key: 'prose_quality:202:12:12:benchmark_recall_gap:文风召回',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                benchmark_recall_checks: [
                  {
                    label: '节奏参照',
                    delivered: true,
                    status: 'pass',
                    evidence: '爆发后用两段短冷却写出关系反馈和下一步压力。',
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

    expect(recallMissingContractFields.taskStatus).toBe('needs_review')
    expect(recallMissingContractFields.annotationStatus).toBe('')
    expect(recallMissingContractFields.note).toContain('缺少字段')
    expect(recallMissingContractFields.note).toContain('source_type')

    const recallHardGapStillOpen = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'benchmark_recall_gap',
        annotation_category: 'benchmark_recall',
        annotation_key: 'prose_quality:202:12:12:benchmark_recall_gap:文风召回',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                benchmark_recall_checks: [
                  {
                    key: 'rhythm_reference',
                    label: '节奏参照',
                    delivered: true,
                    status: 'pass',
                    source_type: 'gaps',
                    source_path: '对标/鬼校/剧情/节奏.md',
                    expected_application: '必须先找到权威节奏参照，再把爆发后冷却写入正文。',
                    delivered_evidence: '爆发后用两段短冷却写出关系反馈和下一步压力。',
                    gaps_preserved: {
                      module_missing: true,
                      rhythm_missing: true,
                    },
                    fix: '暂用通用文风摘要替代权威模块和节奏来源。',
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

    expect(recallHardGapStillOpen.taskStatus).toBe('needs_review')
    expect(recallHardGapStillOpen.annotationStatus).toBe('')
    expect(recallHardGapStillOpen.note).toContain('硬缺口仍未闭环')
    expect(recallHardGapStillOpen.note).toContain('module_missing')

    const recallCleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'benchmark_recall_gap',
        annotation_category: 'benchmark_recall',
        annotation_key: 'prose_quality:202:12:12:benchmark_recall_gap:文风召回',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                benchmark_recall_checks: [
                  {
                    key: 'rhythm_reference',
                    label: '节奏参照',
                    delivered: true,
                    status: 'pass',
                    source_type: 'rhythm',
                    source_path: '参照/节奏模块.md',
                    expected_application: '爆发后用短冷却承接关系反馈和下一步压力。',
                    delivered_evidence: '爆发后用两段短冷却写出关系反馈和下一步压力。',
                    gaps_preserved: '未复制参照桥段，只保留节奏方法。',
                    evidence: '爆发后用两段短冷却写出关系反馈和下一步压力。',
                    fix: '补来源类型、路径、预期应用、交付证据和保留缺口说明。',
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

    expect(recallCleared.taskStatus).toBe('resolved')
    expect(recallCleared.annotationStatus).toBe('resolved')
    expect(recallCleared.note).toContain('写前执行回执复检通过')
    expect(recallCleared.note).toContain('benchmark_recall_checks')

    const writePreparationResidual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'write_preparation_gap',
        annotation_category: 'write_preparation',
        annotation_key: 'prose_quality:202:12:12:write_preparation_gap:写前准备',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                write_preparation_checks: [
                  {
                    label: '资产风险',
                    delivered: false,
                    remaining_risk: '旧钥匙仍未和禁门规则建立现场关系。',
                  },
                ],
              },
            },
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(writePreparationResidual.taskStatus).toBe('needs_review')
    expect(writePreparationResidual.note).toContain('写前执行回执仍未闭环')
    expect(writePreparationResidual.note).toContain('旧钥匙仍未和禁门规则建立现场关系')

    const writePreparationMissingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'write_preparation_gap',
        annotation_category: 'write_preparation',
        annotation_key: 'prose_quality:202:12:12:write_preparation_gap:写前准备',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                write_preparation_checks: [
                  {
                    label: '资产风险',
                    delivered: true,
                    status: 'pass',
                    evidence: '旧钥匙在禁门前被王府管事验过一次，代价是暴露谢怀安手背血纹。',
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

    expect(writePreparationMissingContractFields.taskStatus).toBe('needs_review')
    expect(writePreparationMissingContractFields.annotationStatus).toBe('')
    expect(writePreparationMissingContractFields.note).toContain('缺少字段')
    expect(writePreparationMissingContractFields.note).toContain('preparation_type')

    const writePreparationCleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'write_preparation_gap',
        annotation_category: 'write_preparation',
        annotation_key: 'prose_quality:202:12:12:write_preparation_gap:写前准备',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                write_preparation_checks: [
                  {
                    key: 'asset_risk',
                    label: '资产风险',
                    delivered: true,
                    status: 'pass',
                    preparation_type: 'asset_risk',
                    expected: '旧钥匙必须和禁门规则建立现场关系。',
                    delivered_evidence: '旧钥匙在禁门前被王府管事验过一次，代价是暴露谢怀安手背血纹。',
                    chapter_location: '第12章禁门前对峙段',
                    evidence: '旧钥匙在禁门前被王府管事验过一次，代价是暴露谢怀安手背血纹。',
                    fix: '补准备类型、预期、交付证据和章节位置。',
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

    expect(writePreparationCleared.taskStatus).toBe('resolved')
    expect(writePreparationCleared.annotationStatus).toBe('resolved')
    expect(writePreparationCleared.note).toContain('write_preparation_checks')
  })

  test('keeps source readiness repair tasks open until source readiness checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'source_readiness_gap',
        annotation_category: 'source_readiness',
        annotation_key: 'prose_quality:202:12:12:source_readiness_gap:来源就绪',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            source_readiness_checks: [
              {
                key: 'artifact_state',
                label: '黑色钥匙状态',
                status: 'warn',
                evidence: '正文仍把黑色钥匙当成已解锁道具。',
                fix: '补角色确认钥匙来源和限制。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('来源就绪仍未闭环')
    expect(residual.note).toContain('黑色钥匙状态')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'source_readiness_gap',
        annotation_category: 'source_readiness',
        annotation_key: 'prose_quality:202:12:12:source_readiness_gap:来源就绪',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            source_readiness_checks: [
              {
                key: 'artifact_state',
                label: '黑色钥匙状态',
                status: 'pass',
                evidence: '角色先确认钥匙来源和限制，再让它参与反制。',
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
    expect(missingContractFields.note).toContain('source_name')

    const genericEvidence = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'source_readiness_gap',
        annotation_category: 'source_readiness',
        annotation_key: 'prose_quality:202:12:12:source_readiness_gap:来源就绪',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            source_readiness_checks: [
              {
                key: 'artifact_state',
                label: '黑色钥匙状态',
                status: 'pass',
                source_name: '黑色钥匙',
                source_path: '设定/资产.md',
                read_status: 'ready',
                used_as_fact: '只能触发禁门验纹，不能直接开门',
                chapter_evidence: 'ready',
                evidence: 'ready',
                fix: '已处理。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(genericEvidence.taskStatus).toBe('needs_review')
    expect(genericEvidence.annotationStatus).toBe('')
    expect(genericEvidence.note).toContain('证据泛化')

    const shortGenericEvidence = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'source_readiness_gap',
        annotation_category: 'source_readiness',
        annotation_key: 'prose_quality:202:12:12:source_readiness_gap:来源就绪',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            source_readiness_checks: [
              {
                key: 'artifact_state',
                label: '黑色钥匙状态',
                status: 'pass',
                source_name: '黑色钥匙',
                source_path: '设定/资产.md',
                read_status: '已就绪',
                used_as_fact: '只能触发禁门验纹，不能直接开门',
                chapter_evidence: 'ok',
                evidence: 'ok',
                fix: '已确认。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(shortGenericEvidence.taskStatus).toBe('needs_review')
    expect(shortGenericEvidence.annotationStatus).toBe('')
    expect(shortGenericEvidence.note).toContain('证据泛化')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'source_readiness_gap',
        annotation_category: 'source_readiness',
        annotation_key: 'prose_quality:202:12:12:source_readiness_gap:来源就绪',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            source_readiness_checks: [
              {
                key: 'artifact_state',
                label: '黑色钥匙状态',
                status: 'pass',
                source_name: '黑色钥匙',
                source_path: '设定/资产.md',
                read_status: '已读取并确认未解锁',
                used_as_fact: '只能触发禁门验纹，不能直接开门',
                chapter_evidence: '角色先确认钥匙来源和限制，再让它参与反制。',
                evidence: '角色先确认钥匙来源和限制，再让它参与反制。',
                fix: '补来源路径、读取状态、事实边界和正文证据。',
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
    expect(cleared.note).toContain('来源就绪复检通过')
    expect(cleared.note).toContain('source_readiness_checks')

    const nestedReceiptCleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'source_readiness_gap',
        annotation_category: 'source_readiness',
        annotation_key: 'prose_quality:202:12:12:source_readiness_gap:来源就绪',
      },
      {
        quality_refresh: {
          ok: true,
          score: 90,
          review: {
            oh_story_delivery_receipts: {
              pre_draft_execution_receipts: {
                source_readiness_checks: [
                  {
                    key: 'artifact_state',
                    label: '黑色钥匙状态',
                    status: 'pass',
                    source_name: '黑色钥匙',
                    source_path: '设定/资产.md',
                    read_status: '已读取并确认未解锁',
                    used_as_fact: '只能触发禁门验纹，不能直接开门',
                    chapter_evidence: '角色先确认钥匙来源和限制，再让它参与反制。',
                    evidence: '角色先确认钥匙来源和限制，再让它参与反制。',
                    fix: '补来源路径、读取状态、事实边界和正文证据。',
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
    expect(nestedReceiptCleared.note).toContain('source_readiness_checks')
  })

  test('keeps state tracking repair tasks open until state tracking checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'state_tracking_gap',
        annotation_category: 'state_tracking',
        annotation_key: 'prose_quality:202:12:12:state_tracking_gap:状态跟踪',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            state_tracking_checks: [
              {
                key: 'character_state',
                label: '周远状态',
                status: 'warn',
                evidence: '正文仍让周远直接出手，但上一章状态是昏迷未醒。',
                fix: '补周远苏醒代价和行动限制。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('状态跟踪仍未闭环')
    expect(residual.note).toContain('周远状态')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'state_tracking_gap',
        annotation_category: 'state_tracking',
        annotation_key: 'prose_quality:202:12:12:state_tracking_gap:状态跟踪',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            state_tracking_checks: [
              {
                key: 'character_state',
                label: '周远状态',
                status: 'pass',
                evidence: '正文先写周远苏醒代价和行动限制，再让他参与本章选择。',
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
    expect(missingContractFields.note).toContain('state_subject')

    const genericEvidence = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'state_tracking_gap',
        annotation_category: 'state_tracking',
        annotation_key: 'prose_quality:202:12:12:state_tracking_gap:状态跟踪',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            state_tracking_checks: [
              {
                key: 'character_state',
                label: '周远状态',
                status: 'pass',
                state_subject: '周远',
                state_type: 'character',
                previous_state: '昏迷未醒',
                allowed_state: '短暂苏醒但行动受限',
                used_in_chapter: '只能提醒主角，不直接出手',
                evidence: '已确认。',
                excluded_reason: '无排除项',
                fix: '已处理。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(genericEvidence.taskStatus).toBe('needs_review')
    expect(genericEvidence.annotationStatus).toBe('')
    expect(genericEvidence.note).toContain('证据泛化')

    const genericSourceExcerpt = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'story_state_update_gap',
        annotation_category: 'story_state_update',
        annotation_key: 'prose_quality:202:12:12:story_state_update_gap:状态写回',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            story_state_update_checks: [
              {
                key: 'character_updates_missing',
                label: '角色状态未写回',
                status: 'pass',
                state_domain: 'character',
                target_file: '追踪/角色状态.md',
                update_path: 'character_updates.周远',
                before_state: '昏迷未醒',
                after_state: '短暂苏醒但行动受限',
                source_excerpt: '已写回。',
                evidence: '周远醒来只撑住半句话，手臂仍不能抬。',
                fix: '补目标文件、写回路径、前后状态和来源摘录。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(genericSourceExcerpt.taskStatus).toBe('needs_review')
    expect(genericSourceExcerpt.annotationStatus).toBe('')
    expect(genericSourceExcerpt.note).toContain('证据泛化')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'state_tracking_gap',
        annotation_category: 'state_tracking',
        annotation_key: 'prose_quality:202:12:12:state_tracking_gap:状态跟踪',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            state_tracking_checks: [
              {
                key: 'character_state',
                label: '周远状态',
                status: 'pass',
                state_subject: '周远',
                state_type: 'character',
                previous_state: '昏迷未醒',
                allowed_state: '短暂苏醒但行动受限',
                used_in_chapter: '只能提醒主角，不直接出手',
                evidence: '正文先写周远苏醒代价和行动限制，再让他参与本章选择。',
                excluded_reason: '无排除项',
                fix: '补苏醒代价、行动限制和本章使用边界。',
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
    expect(cleared.note).toContain('状态跟踪复检通过')
    expect(cleared.note).toContain('state_tracking_checks')
  })

  test('keeps story state update repair tasks open until tracking writes clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'story_state_update_gap',
        annotation_category: 'story_state_update',
        annotation_key: 'prose_quality:202:12:12:story_state_update_gap:状态写回',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            story_state_update_checks: [
              {
                key: 'character_updates_missing',
                label: '角色状态未写回',
                status: 'warn',
                evidence: '周远伤势变化没有写入 character_updates，缺 source_excerpt。',
                fix: '补追踪/角色状态.md 对应写回证据。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('状态写回仍未闭环')
    expect(residual.note).toContain('角色状态未写回')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'story_state_update_gap',
        annotation_category: 'story_state_update',
        annotation_key: 'prose_quality:202:12:12:story_state_update_gap:状态写回',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            story_state_update_checks: [
              {
                key: 'character_updates_missing',
                label: '角色状态未写回',
                status: 'pass',
                evidence: 'character_updates 已写入周远伤势变化，并带 source_excerpt。',
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
    expect(missingContractFields.note).toContain('state_domain')

    const genericEvidence = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'story_state_update_gap',
        annotation_category: 'story_state_update',
        annotation_key: 'prose_quality:202:12:12:story_state_update_gap:状态写回',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            story_state_update_checks: [
              {
                key: 'character_updates_missing',
                label: '角色状态未写回',
                status: 'pass',
                state_domain: 'character',
                target_file: '追踪/角色状态.md',
                update_path: 'character_updates.周远',
                before_state: '昏迷未醒',
                after_state: '短暂苏醒但行动受限',
                source_excerpt: '已写回。',
                evidence: '已同步。',
                fix: '已处理。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(genericEvidence.taskStatus).toBe('needs_review')
    expect(genericEvidence.annotationStatus).toBe('')
    expect(genericEvidence.note).toContain('证据泛化')

    const genericSourceExcerptForStateUpdate = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'story_state_update_gap',
        annotation_category: 'story_state_update',
        annotation_key: 'prose_quality:202:12:12:story_state_update_gap:状态写回',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            story_state_update_checks: [
              {
                key: 'character_updates_missing',
                label: '角色状态未写回',
                status: 'pass',
                state_domain: 'character',
                target_file: '追踪/角色状态.md',
                update_path: 'character_updates.周远',
                before_state: '昏迷未醒',
                after_state: '短暂苏醒但行动受限',
                source_excerpt: '已写回。',
                evidence: '周远醒来只撑住半句话，手臂仍不能抬。',
                fix: '补目标文件、写回路径、前后状态和来源摘录。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(genericSourceExcerptForStateUpdate.taskStatus).toBe('needs_review')
    expect(genericSourceExcerptForStateUpdate.annotationStatus).toBe('')
    expect(genericSourceExcerptForStateUpdate.note).toContain('证据泛化')

    const shortEvidence = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'story_state_update_gap',
        annotation_category: 'story_state_update',
        annotation_key: 'prose_quality:202:12:12:story_state_update_gap:状态写回',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            story_state_update_checks: [
              {
                key: 'character_updates_missing',
                label: '角色状态未写回',
                status: 'pass',
                state_domain: 'character',
                target_file: '追踪/角色状态.md',
                update_path: 'character_updates.周远',
                before_state: '昏迷未醒',
                after_state: '短暂苏醒但行动受限',
                source_excerpt: '无',
                evidence: '周远醒来只撑住半句话，手臂仍不能抬。',
                fix: '补目标文件、写回路径、前后状态和来源摘录。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(shortEvidence.taskStatus).toBe('needs_review')
    expect(shortEvidence.annotationStatus).toBe('')
    expect(shortEvidence.note).toContain('证据泛化')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'story_state_update_gap',
        annotation_category: 'story_state_update',
        annotation_key: 'prose_quality:202:12:12:story_state_update_gap:状态写回',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            story_state_update_checks: [
              {
                key: 'character_updates_missing',
                label: '角色状态未写回',
                status: 'pass',
                state_domain: 'character',
                target_file: '追踪/角色状态.md',
                update_path: 'character_updates.周远',
                before_state: '昏迷未醒',
                after_state: '短暂苏醒但行动受限',
                source_excerpt: '周远醒来只撑住半句话，手臂仍不能抬。',
                evidence: 'character_updates 已写入周远伤势变化，并带 source_excerpt。',
                fix: '补目标文件、写回路径、前后状态和来源摘录。',
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
    expect(cleared.note).toContain('状态写回复检通过')
    expect(cleared.note).toContain('story_state_update_checks')
  })

  test('keeps chapter handoff repair tasks open until handoff checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'chapter_handoff_missed',
        annotation_category: 'chapter_handoff',
        annotation_key: 'prose_quality:202:12:12:chapter_handoff_missed:章首承接',
      },
      {
        quality_refresh: {
          ok: true,
          score: 87,
          review: {
            chapter_handoff_checks: [
              {
                key: 'previous_handoff',
                label: '上一章最后一幕',
                status: 'warn',
                evidence: '前300字没有接住阵盘第二道裂纹。',
                fix: '开篇先写裂纹造成的现场压力。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('章首承接仍未闭环')
    expect(residual.note).toContain('上一章最后一幕')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'chapter_handoff_missed',
        annotation_category: 'chapter_handoff',
        annotation_key: 'prose_quality:202:12:12:chapter_handoff_missed:章首承接',
      },
      {
        quality_refresh: {
          ok: true,
          score: 90,
          review: {
            chapter_handoff_checks: [
              {
                key: 'previous_handoff',
                label: '上一章最后一幕',
                status: 'pass',
                evidence: '开篇前300字先写阵盘第二道裂纹压住众人。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('章首承接仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('previous_handoff')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'chapter_handoff_missed',
        annotation_category: 'chapter_handoff',
        annotation_key: 'prose_quality:202:12:12:chapter_handoff_missed:章首承接',
      },
      {
        quality_refresh: {
          ok: true,
          score: 90,
          review: {
            chapter_handoff_checks: [
              {
                key: 'previous_handoff',
                label: '上一章最后一幕',
                status: 'pass',
                previous_handoff: '上一章阵盘裂开第二道缝，众人等待主角回应。',
                opening_obligation: '前300字必须接住裂纹压力和当场选择。',
                opening_evidence: '开篇前300字先写阵盘第二道裂纹压住众人，主角被迫当场选择。',
                location: '前300字：阵盘第二道裂纹压住众人。',
                continuity_action: '主角立刻处理裂纹造成的现场压力。',
                evidence: '开篇前300字先写阵盘第二道裂纹压住众人，主角被迫当场选择。',
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
    expect(cleared.note).toContain('章首承接复检通过')
    expect(cleared.note).toContain('chapter_handoff_checks')
  })

  test('keeps reader expectation opening handoff debts open until handoff checks clear', () => {
    const task = {
      source: 'review_annotation_risk',
      issue_type: 'reader_expectation_debt',
      annotation_category: 'reader_expectation',
      annotation_key: 'reader_expectation_sync:303:3:3:reader_expectation_debt:期待欠账 1',
      payload: {
        status: 'warn',
        missed: [
          {
            key: 'opening_handoff',
            label: '上一章承接',
            text: '上一章最后一幕：湿漉漉学生敲响玻璃门，林晓警告不能开门。',
            match_scope: 'opening',
          },
        ],
      },
    }

    const residual = buildDeliveryRiskRevisionClosurePlan(task, {
      quality_refresh: {
        ok: true,
        score: 86,
        review: {
          chapter_handoff_checks: [
            {
              key: 'previous_handoff',
              label: '上一章最后一幕',
              status: 'warn',
              evidence: '前300字没有接住湿漉漉学生敲玻璃门。',
              fix: '开篇先写门外学生造成的直接压力。',
            },
          ],
        },
      },
      delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
    })

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('章首承接仍未闭环')
    expect(residual.note).toContain('上一章最后一幕')

    const cleared = buildDeliveryRiskRevisionClosurePlan(task, {
      quality_refresh: {
        ok: true,
        score: 90,
        review: {
          chapter_handoff_checks: [
            {
              key: 'previous_handoff',
              label: '上一章最后一幕',
              status: 'pass',
              previous_handoff: '上一章湿漉漉学生敲响玻璃门，林晓警告不能开门。',
              opening_obligation: '前300字必须接住门外学生和不能开门的选择压力。',
              opening_evidence: '开篇前300字先写门外学生敲玻璃门和林晓不能开门的直接反应。',
              location: '前300字：门外学生敲玻璃门，林晓压住门把。',
              continuity_action: '林晓立刻处理不能开门和门外求救之间的冲突。',
              evidence: '开篇前300字先写门外学生敲玻璃门和林晓不能开门的直接反应。',
              remaining_risk: '',
            },
          ],
        },
      },
      delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
    })

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('章首承接复检通过')
    expect(cleared.note).toContain('chapter_handoff_checks')
  })

})
