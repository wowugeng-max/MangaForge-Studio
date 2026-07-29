import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import {
  buildDeliveryRiskRevisionClosurePlan,
  buildRepairTaskRevisionPrompt,
  listQualityContractRequiredFields,
  listQualityContractRequiredFieldKeys,
  qualityAuditCheckFailed,
  qualityContractCheckFailed,
  rawPassLikeStatusOutcome,
} from './repairTaskRevisionPrompt'

function buildAggregateSceneCardReceiptClosure(check: Record<string, unknown>) {
  return buildDeliveryRiskRevisionClosurePlan(
    {
      source: 'review_annotation_risk',
      issue_type: 'scene_card_receipts_gap',
      annotation_key: 'prose_quality:202:12:12:scene_card_receipt:场景卡回执',
    },
    {
      quality_refresh: {
        ok: true,
        score: 88,
        review: {
          quality_audit_checks: [
            {
              key: 'scene_card_receipts_sync_ok',
              label: '场景卡回执',
              status: 'pass',
              receipt_count: 2,
              ...check,
            },
          ],
        },
      },
      delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
    },
  )
}

describe('buildRepairTaskRevisionPrompt contracts/open-until-clear a', () => {
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
          review: {
            issues: [
              {
                key: 'scene_card_receipt_2_undelivered',
                label: '场景卡回执证据复核',
                status: 'ok',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('场景卡回执复检通过')
  })

  test.each([
    ['specific scene-card receipt', 'scene_card_receipt_2_undelivered'],
    ['aggregate scene-card receipt', 'scene_card_receipts_gap'],
  ] as const)('closes a %s task from the explicit aggregate receipt-sync pass', (_label, issueType) => {
    const result = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: issueType,
        annotation_key: 'prose_quality:202:12:12:scene_card_receipt:场景卡回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            quality_audit_checks: [
              {
                key: 'scene_card_receipts_sync_ok',
                label: '场景卡回执',
                status: 'pass',
                missed_count: 0,
                receipt_count: 2,
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(result.taskStatus).toBe('resolved')
    expect(result.annotationStatus).toBe('resolved')
    expect(result.note).toContain('场景卡回执复检通过')
  })

  test('keeps aggregate scene-card receipt tasks open when missed_count is missing', () => {
    const result = buildAggregateSceneCardReceiptClosure({})

    expect(result.taskStatus).toBe('needs_review')
    expect(result.annotationStatus).toBe('')
    expect(result.note).toContain('场景卡回执')
  })

  test('keeps aggregate scene-card receipt tasks open when missed_count is positive', () => {
    const result = buildAggregateSceneCardReceiptClosure({
      key: 'scene_card_receipts_sync',
      missed_count: 1,
    })

    expect(result.taskStatus).toBe('needs_review')
    expect(result.annotationStatus).toBe('')
    expect(result.note).toContain('场景卡回执')
  })

  test('closes aggregate scene-card receipt tasks for an actual camelCase zero missedCount', () => {
    const result = buildAggregateSceneCardReceiptClosure({ missedCount: 0 })

    expect(result.taskStatus).toBe('resolved')
    expect(result.annotationStatus).toBe('resolved')
    expect(result.note).toContain('场景卡回执复检通过')
  })

  test.each([
    ['numeric string zero', '0'],
    ['null', null],
    ['negative number', -1],
    ['NaN', Number.NaN],
    ['positive infinity', Number.POSITIVE_INFINITY],
  ] as const)('keeps aggregate scene-card receipt tasks open for a malformed %s missed_count', (_label, missedCount) => {
    const result = buildAggregateSceneCardReceiptClosure({ missed_count: missedCount })

    expect(result.taskStatus).toBe('needs_review')
    expect(result.annotationStatus).toBe('')
    expect(result.note).toContain('场景卡回执')
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

  test.each([
    ['unknown status', { status: 'unknown' }],
    ['whitespace-padded result', { result: ' pass ' }],
    ['uppercase state', { state: 'PASS' }],
    ['non-string status', { status: ['pass'] }],
  ] as const)('treats a quality-contract check with %s as failed', (_label, explicitStatus) => {
    expect(qualityContractCheckFailed(explicitStatus)).toBe(true)
  })

  test('keeps exact quality-contract pass aliases and status-free boolean compatibility', () => {
    expect(qualityContractCheckFailed({ status: 'pass' })).toBe(false)
    expect(qualityContractCheckFailed({ result: 'ok' })).toBe(false)
    expect(qualityContractCheckFailed({ state: 'done' })).toBe(false)
    expect(qualityContractCheckFailed({ passed: true })).toBe(false)
  })

  test.each([
    ['status pass wins over later severity', { status: 'pass', severity: 'high' }, true],
    ['result ok wins over later severity when status is absent', { result: 'ok', severity: 'high' }, true],
    ['status warn wins over later result pass', { status: 'warn', result: 'pass' }, false],
    ['malformed status wins over later result pass', { status: ['pass'], result: 'pass' }, false],
  ] as const)('uses the first owned raw outcome alias when %s', (_label, outcome, expected) => {
    expect(rawPassLikeStatusOutcome(outcome, 'status', 'result', 'severity')).toBe(expected)
  })

  test('applies ordered raw outcome aliases to quality-contract checks', () => {
    expect(qualityContractCheckFailed({ status: 'pass', result: 'warn' })).toBe(false)
    expect(qualityContractCheckFailed({ result: 'ok', state: 'warn' })).toBe(false)
    expect(qualityContractCheckFailed({ status: 'warn', result: 'pass' })).toBe(true)
    expect(qualityContractCheckFailed({ status: ['pass'], result: 'pass' })).toBe(true)
  })

  test.each([
    ['unknown', 'unknown'],
    ['whitespace-padded', ' pass '],
    ['uppercase', 'PASS'],
    ['non-string', ['pass']],
  ] as const)('treats a quality-audit check with a %s explicit status as failed even when score is high', (_label, status) => {
    const check = {
      key: 'purpose_tag_density_gap',
      label: '目的词详略分配',
      status,
      strategy: 'rewrite',
      purpose_tag: '爽点展开',
      density_change: '爽点场景由一句摘要扩成动作、对白、余波三拍。',
      conflict_bound_info: '信息只跟旧印审判冲突释放。',
      changed_evidence: '“旧印压住案角，长老席第一次退了半步。”',
      fix: '按目的词重排详略。',
      remaining_risk: '',
      score: 100,
    }

    expect(qualityAuditCheckFailed(check)).toBe(true)
  })

  test('allows a raw exact quality-audit pass status before score fallback', () => {
    const check = {
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
      score: 0,
    }

    expect(qualityAuditCheckFailed(check)).toBe(false)
  })

  test('applies ordered raw outcome aliases to quality-audit checks', () => {
    const completeCheck = {
      key: 'purpose_tag_density_gap',
      label: '目的词详略分配',
      strategy: 'rewrite',
      purpose_tag: '爽点展开',
      density_change: '爽点场景由一句摘要扩成动作、对白、余波三拍。',
      conflict_bound_info: '信息只跟旧印审判冲突释放。',
      changed_evidence: '“旧印压住案角，长老席第一次退了半步。”',
      fix: '按目的词重排详略。',
      remaining_risk: '',
      score: 100,
    }

    expect(qualityAuditCheckFailed({ ...completeCheck, status: 'pass', severity: 'high' })).toBe(false)
    expect(qualityAuditCheckFailed({ ...completeCheck, status: 'pass', result: 'warn', severity: 'high' })).toBe(false)
    expect(qualityAuditCheckFailed({ ...completeCheck, status: 'warn', result: 'pass' })).toBe(true)
    expect(qualityAuditCheckFailed({ ...completeCheck, status: ['pass'], result: 'pass' })).toBe(true)
  })

  test('keeps scene-card receipt tasks open when receipt evidence is missing', () => {
    const sceneCardReceipt = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'scene_card_receipt_2_undelivered',
        annotation_key: 'prose_quality:202:12:12:scene_card_receipt:场景卡回执',
      },
      {
        quality_refresh: { ok: true, score: 88 },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(sceneCardReceipt.taskStatus).toBe('needs_review')
    expect(sceneCardReceipt.annotationStatus).toBe('')
    expect(sceneCardReceipt.note).toContain('缺少 scene_card_receipt')
  })

  test('keeps scene-card receipt tasks open when only unrelated checks are present', () => {
    const result = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'scene_card_receipt_2_undelivered',
        annotation_key: 'prose_quality:202:12:12:scene_card_receipt:场景卡回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: { issues: ['ok｜正文工艺｜已通过'] },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(result.taskStatus).toBe('needs_review')
    expect(result.annotationStatus).toBe('')
    expect(result.note).toContain('缺少 scene_card_receipt')
  })

  test('does not close a scene-card receipt task from another scene passing', () => {
    const result = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'scene_card_receipt_2_undelivered',
        annotation_key: 'prose_quality:202:12:12:scene_card_receipt:场景卡回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            issues: [
              {
                key: 'scene_card_receipt_1_undelivered',
                label: '场景1回执证据复核',
                status: 'ok',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(result.taskStatus).toBe('needs_review')
    expect(result.annotationStatus).toBe('')
    expect(result.note).toContain('缺少 scene_card_receipt_2_undelivered')
  })

  test('keeps a matching scene-card receipt task open without an explicit pass outcome', () => {
    const result = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'scene_card_receipt_2_undelivered',
        annotation_key: 'prose_quality:202:12:12:scene_card_receipt:场景卡回执',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            issues: [
              {
                key: 'scene_card_receipt_2_undelivered',
                label: '场景2回执证据复核',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(result.taskStatus).toBe('needs_review')
    expect(result.annotationStatus).toBe('')
    expect(result.note).toContain('明确通过状态缺失')
  })

  test('keeps quality-audit tasks open when audit checks are missing', () => {
    const qualityAudit = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'purpose_tag_density_gap',
        annotation_category: 'quality_audit',
        annotation_key: 'prose_quality:202:12:12:purpose_tag_density_gap:质量诊断缺口 1',
      },
      {
        quality_refresh: { ok: true, score: 88 },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(qualityAudit.taskStatus).toBe('needs_review')
    expect(qualityAudit.annotationStatus).toBe('')
    expect(qualityAudit.note).toContain('缺少 quality_audit_checks')
  })

  test('keeps quality-audit tasks open when only unrelated audit checks are present', () => {
    const result = buildDeliveryRiskRevisionClosurePlan(
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

    expect(result.taskStatus).toBe('needs_review')
    expect(result.annotationStatus).toBe('')
    expect(result.note).toContain('缺少 quality_audit_checks')
    expect(result.note).toContain('purpose_tag_density_gap')
  })

  test('does not match a quality-audit task from unrelated check evidence prose', () => {
    const result = buildDeliveryRiskRevisionClosurePlan(
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
                key: 'information_flow',
                label: '信息传递',
                status: 'pass',
                strategy: 'compress',
                purpose_tag: '信息跟冲突走',
                density_change: '压缩过渡说明，把阵图线索放进对峙动作。',
                conflict_bound_info: '阵图信息随长老席追问暴露。',
                changed_evidence: '“他只露出半枚残印，长老席立刻追问内库阵图。”',
                evidence: '关联说明提到 purpose_tag_density_gap 已由另一项检查处理。',
                fix: '压缩说明，绑定冲突释放。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(result.taskStatus).toBe('needs_review')
    expect(result.annotationStatus).toBe('')
    expect(result.note).toContain('缺少 quality_audit_checks 中 purpose_tag_density_gap')
  })

  test('keeps a bare quality-audit issue string open without an explicit pass prefix', () => {
    const result = buildDeliveryRiskRevisionClosurePlan(
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
            quality_audit_checks: ['purpose_tag_density_gap'],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(result.taskStatus).toBe('needs_review')
    expect(result.annotationStatus).toBe('')
    expect(result.note).toContain('明确通过状态缺失')
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

})
