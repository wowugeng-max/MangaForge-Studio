import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import {
  buildDeliveryRiskRevisionClosurePlan,
  buildRepairTaskRevisionPrompt,
  listQualityContractRequiredFields,
  listQualityContractRequiredFieldKeys,
} from './repairTaskRevisionPrompt'

describe('buildRepairTaskRevisionPrompt', () => {
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

  test('keeps every prompt quality contract wired into required-field validation', () => {
    const source = [
      readFileSync(new URL('./repair-task/prompt.ts', import.meta.url), 'utf8'),
      readFileSync(new URL('./repair-task/prompt-lines.ts', import.meta.url), 'utf8'),
      readFileSync(new URL('./repair-task/prompt-lines-quality.ts', import.meta.url), 'utf8'),
    ].join('\n')
    const promptContractKeys = new Set(promptQualityContractFields(source).keys())
    const requiredFieldKeys = new Set(listQualityContractRequiredFieldKeys())

    const missing = [...promptContractKeys].filter(key => !requiredFieldKeys.has(key))

    expect(promptContractKeys.size).toBeGreaterThan(0)
    expect(missing).toEqual([])
  })

  test('keeps prompt quality contract fields identical to required-field validation', () => {
    const source = [
      readFileSync(new URL('./repair-task/prompt.ts', import.meta.url), 'utf8'),
      readFileSync(new URL('./repair-task/prompt-lines.ts', import.meta.url), 'utf8'),
      readFileSync(new URL('./repair-task/prompt-lines-quality.ts', import.meta.url), 'utf8'),
    ].join('\n')
    const promptContracts = promptQualityContractFields(source)
    const requiredFields = listQualityContractRequiredFields()
    const mismatches = [...promptContracts.entries()]
      .map(([key, fields]) => {
        const required = requiredFields[key] || []
        return fields.join(',') === required.join(',') ? '' : `${key}: prompt=[${fields.join(', ')}] required=[${required.join(', ')}]`
      })
      .filter(Boolean)

    expect(mismatches).toEqual([])
  })

  test('injects scene-card receipt repair instructions with scene and field metadata', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'scene_card_receipt_2_undelivered',
      severity: 'fail',
      source_label: '场景卡回执证据复核',
      chapter_no: 12,
      scene_no: 2,
      fields: ['目标/阻碍/状态变化', '感知锚点'],
      message: '场景2《盟友改口》scene_card_receipts 标记未兑现。',
      evidence: '场景2《盟友改口》scene_card_receipts 标记未兑现。',
      action: '按 delivered=false 的字段修正文，再重写 scene_card_receipts。',
      acceptance_criteria: [
        'scene_card_receipts 全部 delivered=true 且 evidence 可在对应场景正文定位',
        'scene_start_anchor 和 scene_end_anchor 摘自修订后对应场景',
      ],
    })

    expect(prompt).toContain('【场景卡回执闭环】')
    expect(prompt).toContain('目标场景：场景2')
    expect(prompt).toContain('失败字段：目标/阻碍/状态变化、感知锚点')
    expect(prompt).toContain('scene_card_receipts 标记未兑现')
    expect(prompt).toContain('只能修对应场景')
    expect(prompt).toContain('scene_start_anchor')
    expect(prompt).toContain('scene_end_anchor')
    expect(prompt).toContain('scene_card_receipts.evidence')
    expect(prompt).toContain('不得借用其他场景')
  })

  test('injects scene-card execution directive repair instructions for forbidden exposition', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'scene_card_1_forbidden_directives',
      severity: 'fail',
      source_label: '场景卡禁令执行',
      chapter_no: 12,
      scene_no: 1,
      message: '场景1《蓝晶灼手》违反场景卡禁令：不得用整段来历/等级解释蓝晶；正文出现整段来历/等级解释或说明书式科普。',
      evidence: '正文写成“蓝晶源于三百年前，分为七阶九品”，没有动作反应、对白半句或物理后果。',
      action: '删掉说明书式来历、原理和等级解释，改成角色当下动作反应、对话半句、物理后果或证据判断变化。',
      payload: {
        key: 'scene_card_1_forbidden_directives',
        label: '场景卡禁令执行',
        status: 'fail',
        concept_anchor_rules: ['新名词首次出现必须用动作反应、对白半句或物理后果锚定'],
        prose_craft_directives: ['不得用整段来历/等级解释蓝晶'],
      },
    })

    expect(prompt).toContain('【场景卡执行禁令闭环】')
    expect(prompt).toContain('执行问题：scene_card_1_forbidden_directives')
    expect(prompt).toContain('目标场景：场景1')
    expect(prompt).toContain('不得用整段来历/等级解释蓝晶')
    expect(prompt).toContain('删掉说明书式来历、原理和等级解释')
    expect(prompt).toContain('动作反应、对白半句、物理后果')
    expect(prompt).toContain('不得补设定小百科、等级表、来历段或作者式解释')
    expect(prompt).toContain('scene_card_receipts')
    expect(prompt).toContain('concept_anchor_rules_delivered')
    expect(prompt).toContain('prose_craft_directives_delivered')
  })

  test('injects quality audit repair instructions with oh-story diagnosis metadata', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'purpose_tag_density_gap',
      annotation_category: 'quality_audit',
      severity: 'high',
      source_label: '质量诊断',
      chapter_no: 12,
      message: '爽点场景只用一句摘要带过，过渡场景反而展开三段环境描写。',
      action: '按 quality_audit_checks 回修正文：先补本章一句话概括和目的词，再重排详略、删除水文段落、强化信息跟冲突走、隐性展示卖点，并按五维评分最低项选择 rewrite/compress/de_ai/polish 策略。',
      payload: {
        key: 'purpose_tag_density_gap',
        label: '目的词详略分配',
        status: 'fail',
        strategy: 'rewrite',
        checks: [
          {
            key: 'purpose_tag_density_gap',
            label: '目的词详略分配',
            status: 'fail',
            evidence: '爽点场景只用一句摘要带过，过渡场景反而展开三段环境描写。',
            fix: '按目的词重排详略：爽点/打脸展开出手过程，过渡压缩到1-2句。',
            strategy: 'rewrite',
          },
        ],
      },
    })

    expect(prompt).toContain('【质量诊断修复】')
    expect(prompt).toContain('质量问题：purpose_tag_density_gap')
    expect(prompt).toContain('目的词详略分配')
    expect(prompt).toContain('爽点场景只用一句摘要带过')
    expect(prompt).toContain('本章一句话概括')
    expect(prompt).toContain('目的词详略')
    expect(prompt).toContain('水文')
    expect(prompt).toContain('信息跟冲突走')
    expect(prompt).toContain('五维评分')
    expect(prompt).toContain('rewrite/compress/de_ai/polish')
    expect(prompt).toContain('quality_audit_checks')
    expect(prompt).toContain('quality_audit_checks 每项必须包含 key, label, status, strategy, purpose_tag, density_change, conflict_bound_info, changed_evidence, fix, remaining_risk')
    expect(prompt).toContain('爽点/打脸/高潮未展开、过渡水文未压缩或 changed_evidence 缺正文证据时 status 不能写 pass/ok')
  })

  test('adds nested oh-story delivery receipt output contract to repair prompts', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'purpose_tag_density_gap',
      annotation_category: 'quality_audit',
      severity: 'high',
      source_label: '质量诊断',
      chapter_no: 12,
      message: '爽点场景只用一句摘要带过。',
      action: '按 quality_audit_checks 回修正文并输出修复回执。',
      payload: {
        key: 'purpose_tag_density_gap',
        label: '目的词详略分配',
        status: 'fail',
        checks: [
          {
            key: 'purpose_tag_density_gap',
            label: '目的词详略分配',
            status: 'fail',
            evidence: '爽点场景只用一句摘要带过。',
            fix: '补出出手过程、对话交锋和结果余波。',
          },
        ],
      },
    })

    expect(prompt).toContain('【oh-story交付回执输出】')
    expect(prompt).toContain('oh_story_delivery_receipts')
    expect(prompt).toContain('revision_receipts')
    expect(prompt).toContain('scene_card_receipts')
    expect(prompt).toContain('quality_audit_repair_receipts')
    expect(prompt).toContain('不能只散落在章节顶层或 scene_breakdown')
  })

  test('injects quality audit repair receipt closure instructions', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'quality_audit_repair_receipt',
      annotation_category: 'quality_audit_repair_receipt',
      severity: 'fail',
      source_label: '质量回执',
      chapter_no: 12,
      message: 'original_evidence 有问题，但 changed_evidence 为空。',
      action: '重新修订并逐条输出 quality_audit_repair_receipts.changed_evidence。',
      payload: {
        label: '质量诊断修复回执缺口 1',
        missed: [
          { label: '目的词详略分配', text: 'changed_evidence 为空，无法确认修复后正文证据。' },
        ],
        next_actions: ['quality_audit_repair_receipts 要逐条对应 quality_audit_checks 中 status=fail/warn 的诊断项。'],
      },
    })

    expect(prompt).toContain('【质量诊断修复回执闭环】')
    expect(prompt).toContain('质量问题：quality_audit_repair_receipt')
    expect(prompt).toContain('changed_evidence 为空')
    expect(prompt).toContain('quality_audit_repair_receipts.changed_evidence')
    expect(prompt).toContain('逐条对应 quality_audit_checks')
    expect(prompt).toContain('不得只写“已修复”')
  })

  test('injects deslop repair receipt closure instructions', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'deslop_repair_receipt',
      annotation_category: 'deslop_repair_receipt',
      severity: 'fail',
      source_label: '去AI味回执',
      chapter_no: 12,
      message: 'changed_evidence 为空，无法证明连续主语问题已修。',
      action: '重新复核去AI味修复结果，并逐条输出 deslop_repair_receipts.changed_evidence。',
      payload: {
        label: '去AI味修复回执残留 1',
        missed: [
          { label: 'Gate B 句式套路', text: 'changed_evidence 为空，无法证明连续主语问题已修。' },
        ],
        next_actions: ['deslop_repair_receipts 要逐条对应 deslop_checks 或 story-deslop Gate A-G 原 fail/warn 项。'],
      },
    })

    expect(prompt).toContain('【去AI味修复回执闭环】')
    expect(prompt).toContain('去AI味问题：deslop_repair_receipt')
    expect(prompt).toContain('Gate B 句式套路')
    expect(prompt).toContain('deslop_repair_receipts.changed_evidence')
    expect(prompt).toContain('story-deslop Gate A-G')
    expect(prompt).toContain('不得只写“已修复”')
  })

  test('injects revision cascade impact repair instructions', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'revision_cascade_impact',
      annotation_category: 'revision_cascade_impact',
      severity: 'high',
      source_label: '级联修订',
      chapter_no: 12,
      message: '令牌状态改变会影响第13章开篇交接。',
      action: '复核 revision_receipts.cascade_impacts，补齐 evidence/source_excerpt。',
      payload: {
        label: '修订级联影响 2',
        missed: [
          { target: '令牌背面血字', text: '令牌状态改变会影响第13章开篇交接。', required_action: '下一章先同步令牌新状态。' },
        ],
        next_actions: ['后续章节必须先同步修订后的伏笔、时间线、角色状态、资产归属和关系边界。'],
      },
    })

    expect(prompt).toContain('【修订级联影响闭环】')
    expect(prompt).toContain('级联问题：revision_cascade_impact')
    expect(prompt).toContain('令牌背面血字')
    expect(prompt).toContain('revision_receipts.cascade_impacts')
    expect(prompt).toContain('后续章节')
    expect(prompt).toContain('evidence/source_excerpt')
  })

  test('injects revision context receipt repair instructions', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'revision_context_receipts_sync',
      annotation_category: 'revision_context_receipts',
      severity: 'high',
      source_label: '修订上下文',
      chapter_no: 12,
      message: '上一章禁门仍未开启，但修订后直接进入门后。',
      action: '补齐 revision_context_receipts 中 status=warn/fail 或 remaining_risk 非空的上下文差异。',
      payload: {
        label: '修订上下文残留 1',
        missed: [
          {
            label: '时间线核对',
            evidence: '上一章禁门仍未开启，但修订后直接进入门后。',
            fix: '补出禁门开启动作，或把门后信息推迟到下一章。',
          },
        ],
        next_actions: [
          '下一章或下一轮修订开始前，先同步 previous_chapter、next_chapter、伏笔、角色卡、时间线、设定和关系边界。',
        ],
      },
    })

    expect(prompt).toContain('【修订上下文回执闭环】')
    expect(prompt).toContain('上下文问题：revision_context_receipts_sync')
    expect(prompt).toContain('上一章禁门仍未开启')
    expect(prompt).toContain('revision_context_receipts')
    expect(prompt).toContain('previous_chapter、current_chapter、next_chapter')
    expect(prompt).toContain('foreshadowing、character_cards、timeline、setting_context')
    expect(prompt).toContain('source_excerpt')
    expect(prompt).toContain('不能假设已经一致')
  })

  test('injects revision scope guard repair instructions', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'revision_scope_guard',
      annotation_category: 'revision_scope_guard',
      severity: 'high',
      source_label: '修订幅度',
      chapter_no: 12,
      message: '修订扩写 1200 字，超过允许差异 800 字。',
      action: '下一轮修订不要重写整章；只按自检证据和修订回执残留做局部修复。',
      payload: {
        label: '修订幅度过大 1200',
        missed: [
          { label: '修订幅度过大', text: '修订扩写 1200 字，超过允许差异 800 字。' },
        ],
        next_actions: ['恢复被误删的伏笔、钩子、角色特征、情节推进和必要转折。'],
      },
    })

    expect(prompt).toContain('【修订幅度守恒】')
    expect(prompt).toContain('幅度问题：revision_scope_guard')
    expect(prompt).toContain('修订扩写 1200 字')
    expect(prompt).toContain('不要重写整章')
    expect(prompt).toContain('max(原文 30%, 800 字)')
    expect(prompt).toContain('伏笔、钩子、角色特征')
  })

  test('injects prose revision receipt sync repair instructions for missing delivery risk receipts', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'prose_revision_receipt_sync',
      annotation_category: 'prose_revision_receipt_sync',
      severity: 'high',
      source_label: '修订回执',
      chapter_no: 12,
      message: '缺少交稿风险修订回执。',
      action: '补齐 delivery_risk_receipts 对应的 revision_receipts；每条必须写 required_action、repair_segment、applied_fix 和 changed_evidence。',
      payload: {
        label: '修订回执残留 1',
        missed: [
          {
            category: 'delivery_risk_receipt',
            label: '交稿风险修订回执缺失',
            text: '缺少对应交稿风险修订回执：章末翻页风险｜章末把带血腰牌变成新的未解问题。',
            evidence: 'ending_actions｜最后300字没有形成追读钩子。',
          },
        ],
        next_actions: [
          '补齐 delivery_risk_receipts 对应的 revision_receipts；每条必须写 required_action、repair_segment、applied_fix 和 changed_evidence。',
        ],
      },
    })

    expect(prompt).toContain('【修订回执同步闭环】')
    expect(prompt).toContain('修订问题：prose_revision_receipt_sync')
    expect(prompt).toContain('交稿风险修订回执缺失')
    expect(prompt).toContain('章末把带血腰牌变成新的未解问题')
    expect(prompt).toContain('最后300字没有形成追读钩子')
    expect(prompt).toContain('revision_receipts')
    expect(prompt).toContain('required_action、repair_segment、applied_fix 和 changed_evidence')
    expect(prompt).toContain('不得只补普通润色回执')
  })

  test('injects batch brief context for batch plan mismatch repairs', () => {
    const prompt = buildRepairTaskRevisionPrompt(
      {
        issue_type: 'batch_brief_mismatch',
        segment: '第8-10章',
        message: '本章有 2 项批次任务书兑现风险',
        action: '对照下一批任务书重修本章职责、读者回报、主线焦点和禁抢跑边界。',
        chapter_no: 9,
        acceptance_criteria: ['补齐阵盘反噬回报', '不能提前揭露规则源头'],
        batch_plan_context: {
          batch_goal: '三章内进入内门视野。',
          reader_payoff_plan: '升级、打脸、规则反制逐章交付。',
          mainline_focus: '外门危机 -> 内门招揽',
          forbidden_boundary: '第10章前不得揭露规则源头。',
          chapter_plan: {
            chapter_no: 9,
            title: '阵盘裂纹',
            chapter_task: '兑现阵盘反噬回报。',
            conflict: '阵盘裂纹导致规则反噬。',
            ending_hook: '内门长老注意到主角。',
            mainline_progress: '主角进入内门候选名单。',
          },
        },
      },
      {
        input_ref: JSON.stringify({
          next_batch_brief: {
            batchGoal: '旧字段也能兼容',
          },
        }),
      },
    )

    expect(prompt).toContain('【批次任务书兑现】')
    expect(prompt).toContain('本批目标：三章内进入内门视野。')
    expect(prompt).toContain('读者回报：升级、打脸、规则反制逐章交付。')
    expect(prompt).toContain('主线焦点：外门危机 -> 内门招揽')
    expect(prompt).toContain('禁抢跑边界：第10章前不得揭露规则源头。')
    expect(prompt).toContain('本章职责：兑现阵盘反噬回报。')
    expect(prompt).toContain('本章冲突：阵盘裂纹导致规则反噬。')
    expect(prompt).toContain('章末钩子：内门长老注意到主角。')
    expect(prompt).toContain('补齐阵盘反噬回报；不能提前揭露规则源头')
  })

  test('injects failed recovery evidence into batch repair prompts', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'recovery_evidence_mismatch',
      segment: '第41-43章',
      message: '恢复放行依据 2 项未兑现，上一轮闭环可能没有真正落到正文。',
      action: '按失效依据回修本批：逐项核对样章执行、读者回报、主线/剧情线和批次任务书，修完后重新运行交稿复盘。',
      acceptance_criteria: [
        '第42章对白交锋补回样章节奏',
        '恢复依据复检为 ok 且 failed_evidence 为空',
      ],
      recovery_evidence_review: {
        status: 'warn',
        summary: '恢复放行依据 2 项未被本批交稿兑现：样章任务书复检通过 1 项；第42章样章已重审',
        failed_evidence: [
          '样章任务书复检通过 1 项',
          '第42章样章已重审',
        ],
        failed_items: [
          { evidence: '样章任务书复检通过 1 项', risk_labels: ['风格样章缺口 2 项'] },
          { evidence: '第42章样章已重审', risk_labels: ['风格样章缺口 2 项'] },
        ],
      },
    })

    expect(prompt).toContain('【恢复依据失效回修】')
    expect(prompt).toContain('复盘结论：恢复放行依据 2 项未被本批交稿兑现')
    expect(prompt).toContain('失效依据：样章任务书复检通过 1 项')
    expect(prompt).toContain('对应风险：风格样章缺口 2 项')
    expect(prompt).toContain('失效依据：第42章样章已重审')
    expect(prompt).toContain('第42章对白交锋补回样章节奏；恢复依据复检为 ok 且 failed_evidence 为空')
    expect(prompt).toContain('修订要求：逐项把失效依据改成正文可见的兑现结果')
    expect(prompt).toContain('修订后必须重新运行批次交稿复盘')
  })

  test('uses single-chapter governance recheck wording for recovery evidence annotation repairs', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'review_annotation_risk',
      issue_type: 'recovery_evidence_mismatch',
      annotation_source: 'governance_recheck_sync',
      annotation_category: 'recovery_evidence',
      chapter_no: 42,
      message: '单章交稿未继承治理复查记忆。',
      action: '按治理复查记忆回修本章，把修后证据和观察项写成正文可见动作。',
      acceptance_criteria: [
        '第42章对白交锋补回样章节奏',
        'governance_recheck_sync 复检为 ok 且 failed_evidence 为空',
      ],
      recovery_evidence_review: {
        status: 'warn',
        summary: '恢复依据缺口 2',
        failed_evidence: [
          '第42章对白交锋已补回样章节奏',
        ],
        watch_items: [
          '下一章继续观察样章策略命中率',
        ],
      },
    })

    expect(prompt).toContain('【单章恢复依据回修】')
    expect(prompt).toContain('治理复查记忆')
    expect(prompt).toContain('失效依据：第42章对白交锋已补回样章节奏')
    expect(prompt).toContain('仍需观察：下一章继续观察样章策略命中率')
    expect(prompt).toContain('修订后必须重新运行单章治理复查 / governance_recheck_sync')
    expect(prompt).not.toContain('修订后必须重新运行批次交稿复盘')
  })

  test('injects approval blocker evidence before generic delivery risk repair', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'review_annotation_risk',
      issue_type: 'approval_blocker',
      annotation_category: 'approval_blocker',
      severity: 'high',
      source_label: '入库阻断',
      message: '门槛测试与参考样章连续三拍相似；原因：门槛测试与参考样章连续三拍相似；参考桥段迁移过近，需要改成原创机制反制。',
      action: '先解除入库阻断：按阻断原因修订正文，重新复检并确认章节可以进入验收或入库。',
      acceptance_criteria: [
        '入库阻断已经解除，章节可重新进入验收或入库',
        '修订后重新运行章节质量复检，质量分不低于78',
      ],
      payload: {
        type: 'reference_safety_blocked',
        label: '仿写安全阻断',
        detail: '门槛测试与参考样章连续三拍相似',
        score_label: '入库阻断 76',
        copy_hit_count: 2,
        reasons: [
          '门槛测试与参考样章连续三拍相似',
          '参考桥段迁移过近，需要改成原创机制反制。',
        ],
        safety_decision: {
          blocked: true,
          copy_hit_count: 2,
        },
      },
    })

    expect(prompt).toContain('【入库阻断修复】')
    expect(prompt).toContain('阻断类型：仿写安全阻断')
    expect(prompt).toContain('阻断评分：入库阻断 76')
    expect(prompt).toContain('相似命中：2')
    expect(prompt).toContain('阻断原因：门槛测试与参考样章连续三拍相似；参考桥段迁移过近，需要改成原创机制反制。')
    expect(prompt).toContain('必须先解除入库阻断，再处理普通质量润色')
    expect(prompt).toContain('修订后必须重新运行正文质检和入库门禁')
    expect(prompt.indexOf('【入库阻断修复】')).toBeLessThan(prompt.indexOf('【交稿风险证据】'))
  })

  test('asks approval blocker repairs to restore missing next-chapter quality plans', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'review_annotation_risk',
      issue_type: 'approval_blocker',
      annotation_category: 'approval_blocker',
      severity: 'high',
      source_label: '入库阻断',
      message: '下一章质量续航计划缺失：必须输出 next_chapter_quality_plan。',
      action: '补齐 next_chapter_quality_plan 后重新复检。',
      payload: {
        type: 'quality_gate',
        label: '质量门禁阻断',
        detail: '下一章质量续航计划缺失',
        score_label: '入库阻断 92',
        reasons: [
          '下一章质量续航计划缺失：必须输出 next_chapter_quality_plan，包含质量目标、开篇/中段/章末动作、禁用重复和证据依据',
        ],
      },
    })

    expect(prompt).toContain('【下一章质量续航计划修复】')
    expect(prompt).toContain('next_chapter_quality_plan')
    expect(prompt).toContain('quality_focus')
    expect(prompt).toContain('opening_actions')
    expect(prompt).toContain('middle_actions')
    expect(prompt).toContain('ending_actions')
    expect(prompt).toContain('avoid_repetition')
    expect(prompt).toContain('evidence_basis')
    expect(prompt).toContain('oh_story_delivery_receipts.next_chapter_quality_plan')
  })

  test('injects next-chapter quality plan receipt repair contract', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'next_chapter_quality_plan_receipts_gap',
      annotation_category: 'next_chapter_quality_plan',
      severity: 'warn',
      source_label: '质量续航回执',
      chapter_no: 13,
      message: '质量续航回执缺失：必须输出 next_chapter_quality_plan_receipts。',
      action: '补齐本章对上一章质量续航计划的执行回执。',
      payload: {
        label: '质量续航回执未生成',
        missed: [
          {
            key: 'opening_actions',
            label: '开篇动作',
            text: '上一章要求前300字承接审判余波，但本章没有回执证明。',
          },
        ],
        next_actions: ['补齐 next_chapter_quality_plan_receipts，并引用本章正文证据。'],
      },
    })

    expect(prompt).toContain('【质量续航回执闭环】')
    expect(prompt).toContain('next_chapter_quality_plan_receipts')
    expect(prompt).toContain('上一章要求前300字承接审判余波')
    expect(prompt).toContain('next_chapter_quality_plan_receipts 每项必须包含 key, label, delivered, evidence, remaining_risk')
    expect(prompt).toContain('oh_story_delivery_receipts.pre_draft_execution_receipts.next_chapter_quality_plan_receipts')
  })

  test('falls back to run input next batch brief when task lacks embedded context', () => {
    const prompt = buildRepairTaskRevisionPrompt(
      {
        issue_type: 'batch_brief_mismatch',
        message: '漏掉本批主线推进',
        chapter_no: 10,
      },
      {
        input_ref: JSON.stringify({
          next_batch_brief: {
            batchGoal: '第一轮规则试探闭环。',
            readerPayoffPlan: '每章交付一条可验证规则。',
            mainlineFocus: '宿舍规则 -> 夜巡规则',
            forbiddenBoundary: '不得揭露规则源头。',
            chapters: [
              { chapterNo: 10, title: '夜巡脚步', chapterTask: '证明夜巡规则有效。', endingHook: '宿管敲门。' },
            ],
          },
        }),
      },
    )

    expect(prompt).toContain('本批目标：第一轮规则试探闭环。')
    expect(prompt).toContain('本章职责：证明夜巡规则有效。')
    expect(prompt).toContain('章末钩子：宿管敲门。')
  })

  test('injects serial rhythm evidence for repeated safe-batch reading fatigue', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'serial_rhythm_fatigue',
      message: '本批存在 3 项连载节奏同质化。',
      action: '按批次重修节奏：轮换冲突来源、读者回报、章末追读问题和可视化场面。',
      serial_rhythm_review: {
        score: 48,
        risks: [
          '冲突来源连续 3 章重复：执事逼主角交出阵盘',
          '章末钩子连续 3 章重复：黑影盯上阵盘',
        ],
        evidence: [
          '第8章：执事逼主角交出阵盘 / 阵盘反噬打脸 / 黑影盯上阵盘',
          '第9章：执事逼主角交出阵盘 / 阵盘反噬打脸 / 黑影盯上阵盘',
        ],
      },
    })

    expect(prompt).toContain('【连载节奏疲劳】')
    expect(prompt).toContain('节奏评分：48')
    expect(prompt).toContain('冲突来源连续 3 章重复：执事逼主角交出阵盘')
    expect(prompt).toContain('第8章：执事逼主角交出阵盘')
    expect(prompt).toContain('必须轮换冲突来源、读者回报、章末追读问题和可视化场面')
  })

  test('injects volume segment evidence for safe-batch stage acceptance gaps', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'volume_segment_missed',
      message: '本章有 2 项卷级阶段验收漏兑现。',
      action: '对照当前卷目标和阶段冲突，补齐身份变化、阶段结算和内门视野入场。',
      volume_segment_review: {
        planned: [
          '当前卷目标：进入内门视野',
          '当前阶段：试炼收束',
          '阶段冲突：外门试炼必须结算身份变化',
        ],
        actual: ['本章主线进度：试炼余波未定'],
        missed: [
          { label: '内门令牌入场', text: '第20章应让内门令牌或同等身份入口落地。' },
          { label: '身份变化结算', text: '外门试炼收束时主角身份没有发生可见变化。' },
        ],
        gate_summary: '当前卷段的身份变化和内门视野还没有完成阶段验收。',
      },
    })

    expect(prompt).toContain('【卷级阶段验收】')
    expect(prompt).toContain('当前卷目标：进入内门视野')
    expect(prompt).toContain('阶段冲突：外门试炼必须结算身份变化')
    expect(prompt).toContain('本章主线进度：试炼余波未定')
    expect(prompt).toContain('内门令牌入场：第20章应让内门令牌或同等身份入口落地。')
    expect(prompt).toContain('必须补成可见的阶段结果')
    expect(prompt).toContain('不能把阶段结算继续后移')
  })

  test('injects expansion structure repair evidence for repeated five-chapter hotspots', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'safe_batch_expansion_structure_repair',
      severity: 'high',
      message: '中段连续 2 次扩批热区，需要先改批次结构。',
      action: '先做中段固定段落治理和批次结构改写，再恢复5章连写。',
      safe_batch_expansion_structure_review: {
        repeated_hotspot_segment: {
          key: 'middle',
          label: '中段',
          count: 2,
          summary: '中段连续 2 次扩批热区。',
        },
        latest_chapter_nos: [13, 14, 15, 16, 17],
        affected_chapter_nos: [15, 16],
        hotspot_summaries: [
          '中段第15、16章存在 3 项扩批风险：核心 1、回报 1、拉力 1。',
        ],
        structure_actions: [
          '重写中段固定职责：每批第3-4章必须完成主线转折、显性回报和章末追读。',
          '批次节奏重排：前段抛压，中段兑现并升级，后段留钩，不允许中段只铺垫。',
        ],
        rollback_policy: {
          target_chapter_count: 3,
          summary: '下一轮回退到 2-3 章安全连写。',
        },
      },
    })

    expect(prompt).toContain('【扩批结构修复】')
    expect(prompt).toContain('复发段位：中段连续 2 次')
    expect(prompt).toContain('最近批次：第13、14、15、16、17章')
    expect(prompt).toContain('高危章节：第15、16章')
    expect(prompt).toContain('中段固定职责')
    expect(prompt).toContain('批次节奏重排')
    expect(prompt).toContain('不能只修单章语句或局部爽点')
    expect(prompt).toContain('重新运行5章扩批分段复盘')
  })

  test('injects expansion structure decision execution evidence for batch repairs', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'safe_batch_expansion_structure_decision_mismatch',
      severity: 'medium',
      message: '扩批结构决策未落地。',
      action: '逐章补齐段位职责和观察指标。',
      safe_batch_expansion_structure_decision_review: {
        recommendation: 'restore_five_chapter',
        target_chapter_count: 5,
        segment_label: '中段',
        summary: '结构修复决策未落地：第72章有 2 项缺口。',
        instruction: '恢复 5 章扩批，但每章必须明确前段/中段/后段职责。',
        observation_metrics: ['通过率 67% -> 100%', '失败主因 3 -> 0'],
        missed_chapter_nos: [72],
        failed_items: [
          { chapter_no: 72, key: 'segment_role', label: '中段职责', text: '第72章没有承担中段主线转折。' },
          { chapter_no: 72, key: 'observation_metrics', label: '观察指标', text: '正文没有证明观察指标。' },
        ],
      },
    })

    expect(prompt).toContain('【扩批结构决策执行】')
    expect(prompt).toContain('决策：restore_five_chapter')
    expect(prompt).toContain('目标批次：5章')
    expect(prompt).toContain('观察段位：中段')
    expect(prompt).toContain('观察指标：通过率 67% -> 100%；失败主因 3 -> 0')
    expect(prompt).toContain('漏项章节：第72章')
    expect(prompt).toContain('中段职责：第72章没有承担中段主线转折。')
    expect(prompt).toContain('重新回填 expansion_structure_decision_execution')
  })

  test('injects default lane redesign obligations into structure decision repair prompts', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'safe_batch_expansion_structure_decision_mismatch',
      severity: 'high',
      message: '默认5章档位模板未落地。',
      action: '补齐默认档位四项模板。',
      safe_batch_expansion_structure_decision_review: {
        recommendation: 'escalate_structure_redesign',
        target_chapter_count: 1,
        segment_label: '中段',
        summary: '默认5章档位模板未落地：第89章有 4 项缺口。',
        instruction: '默认 5 章档位连续恢复判定失效，先重写默认档位结构。',
        observation_metrics: ['恢复判定连续失效 2 次', '同维复发：核心偏移、回报欠账、追读拉力'],
        default_five_chapter_lane_redesign: {
          reason: 'repeated_recovery_verdict_relapse',
          relapse_count: 2,
          repeated_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
          segment_duty_rewrite: '段位职责重写：定义默认 5 章前段、中段、后段职责。',
          conflict_rotation: '冲突轮换：五章内轮换规则压迫、人物对抗、信息误导。',
          payoff_density: '回报密度：每章都有显性回报，不能连续两章只铺垫。',
          ending_hook_template: '章末追读模板：最后 300 字给触发事件、读者问题、下一章风险。',
        },
        missed_chapter_nos: [89],
        failed_items: [
          { chapter_no: 89, key: 'default_lane_segment_duty', label: '默认档位段位职责', text: '没有回填默认5章段位职责模板。' },
          { chapter_no: 89, key: 'default_lane_conflict_rotation', label: '冲突轮换', text: '没有回填五章冲突轮换模板。' },
          { chapter_no: 89, key: 'default_lane_payoff_density', label: '回报密度', text: '没有回填每章显性回报密度。' },
          { chapter_no: 89, key: 'default_lane_ending_hook_template', label: '章末追读模板', text: '没有回填最后300字追读三件套。' },
        ],
      },
    })

    expect(prompt).toContain('默认5章档位结构重构')
    expect(prompt).toContain('恢复判定连续失效：2次')
    expect(prompt).toContain('同维复发：核心偏移、回报欠账、追读拉力')
    expect(prompt).toContain('段位职责重写：定义默认 5 章前段、中段、后段职责。')
    expect(prompt).toContain('冲突轮换：五章内轮换规则压迫、人物对抗、信息误导。')
    expect(prompt).toContain('回报密度：每章都有显性回报，不能连续两章只铺垫。')
    expect(prompt).toContain('章末追读模板：最后 300 字给触发事件、读者问题、下一章风险。')
    expect(prompt).toContain('default_lane_conflict_rotation_delivered')
  })

  test('injects expansion structure validation trend into structure repair prompts', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'safe_batch_expansion_structure_repair',
      severity: 'high',
      message: '中段验证后仍复发，需要按长期趋势重写结构。',
      action: '根据扩批结构验证趋势重写批次结构。',
      safe_batch_expansion_structure_review: {
        repeated_hotspot_segment: {
          key: 'middle',
          label: '中段',
          count: 3,
        },
        latest_chapter_nos: [59, 60, 61, 62, 63],
        affected_chapter_nos: [61],
        expansion_structure_validation_trend: {
          visible: true,
          status: 'warn',
          label: '扩批结构验证趋势',
          summary: '中段验证通过率 67%（2/3批），失败主因：核心偏移1、回报欠账1、追读拉力1，恢复5章后第1个扩批批次复发。',
          segment_key: 'middle',
          segment_label: '中段',
          validation_batch_count: 3,
          passed_batch_count: 2,
          failed_batch_count: 1,
          pass_rate: 67,
          latest_status: 'ok',
          latest_chapter_nos: [56, 57, 58],
          failure_reasons: [
            { key: 'core', label: '核心偏移', count: 1 },
            { key: 'payoff', label: '回报欠账', count: 1 },
            { key: 'reader_pull', label: '追读拉力', count: 1 },
          ],
          recurrence_after_restore: {
            visible: true,
            interval_batch_count: 1,
            interval_label: '恢复5章后第1个扩批批次复发',
            recurrence_chapter_nos: [59, 60, 61, 62, 63],
          },
        },
      },
    })

    expect(prompt).toContain('【扩批结构验证趋势】')
    expect(prompt).toContain('趋势段位：中段')
    expect(prompt).toContain('验证通过率：67%（2/3批）')
    expect(prompt).toContain('最近验证批：第56、57、58章')
    expect(prompt).toContain('失败主因：核心偏移1；回报欠账1；追读拉力1')
    expect(prompt).toContain('复发间隔：恢复5章后第1个扩批批次复发')
    expect(prompt).toContain('复发批次：第59、60、61、62、63章')
    expect(prompt).toContain('必须按长期复发惯性重写批次结构')
  })

  test('injects default lane template validation gaps into structure repair prompts', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'safe_batch_expansion_structure_repair',
      severity: 'medium',
      message: '默认档位模板回检未通过。',
      action: '第91章缺回报密度，下一轮结构修复任务书必须补齐。',
      safe_batch_expansion_structure_review: {
        repeated_hotspot_segment: {
          key: 'middle',
          label: '中段',
          count: 2,
        },
        latest_chapter_nos: [90, 91, 92],
        affected_chapter_nos: [91],
        validation_result: {
          visible: true,
          status: 'warn',
          label: '扩批结构验证',
          summary: '默认档位模板回检未通过：第91章缺回报密度，不能恢复默认5章档位。',
          validation_chapter_nos: [90, 91, 92],
          failed_chapter_nos: [91],
          risk_count: 1,
          default_five_chapter_lane_template_verdict: {
            visible: true,
            status: 'failed',
            label: '默认档位模板回检',
            summary: '默认档位模板回检未通过：第91章缺回报密度，不能恢复默认5章档位。',
            validation_chapter_nos: [90, 91, 92],
            missing_count: 1,
            missing_requirements: [
              { key: 'default_lane_payoff_density', label: '回报密度', chapter_nos: [91] },
            ],
          },
        },
      },
    })

    expect(prompt).toContain('【默认档位模板验证缺项】')
    expect(prompt).toContain('验证结论：默认档位模板回检未通过：第91章缺回报密度')
    expect(prompt).toContain('缺项章节：第91章缺回报密度')
    expect(prompt).toContain('修订要求：把缺失模板转成下一轮批次任务书的段位职责、冲突轮换、显性回报密度和章末追读检查项')
    expect(prompt).toContain('回报密度修复：第91章必须补出显性回报')
    expect(prompt).toContain('default_lane_payoff_density_delivered')
  })

  test('injects production relapse evidence into default lane template structure repair prompts', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'safe_batch_expansion_structure_repair',
      severity: 'high',
      message: '默认档位模板生产后验仍复发。',
      action: '按真实5章生产失败维度重修当前模板版本。',
      safe_batch_expansion_structure_review: {
        repeated_hotspot_segment: {
          key: 'middle',
          label: '中段',
          count: 2,
        },
        default_five_chapter_lane_template_repair: {
          visible: true,
          status: 'failed',
          label: '默认档位模板验证缺项',
          summary: '默认档位模板回检未通过：生产后验仍复发：核心偏移、回报欠账。',
          validation_chapter_nos: [114, 115, 116],
          missing_count: 0,
          missing_requirements: [],
          production_failed_count: 2,
          production_relapse_verdict: {
            visible: true,
            status: 'failed',
            label: '默认档位模板生产后验判定',
            template_version_id: 'safe_batch_expansion_structure_repair:668',
            default_batch_chapter_nos: [109, 110, 111, 112, 113],
            restore_chapter_nos: [104, 105, 106, 107, 108],
            previous_validation_chapter_nos: [96, 97, 98],
            validation_chapter_nos: [114, 115, 116],
            failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
            cleared_failure_reasons: ['追读拉力'],
            remaining_failure_reasons: ['核心偏移', '回报欠账'],
            failed_count: 2,
            failed_requirements: [
              { key: 'default_lane_segment_duty', label: '默认档位段位职责', failure_reason: '核心偏移', chapter_nos: [114, 115, 116] },
              { key: 'default_lane_payoff_density', label: '回报密度', failure_reason: '回报欠账', chapter_nos: [114, 115, 116] },
            ],
            summary: '默认档位模板生产后验仍复发：核心偏移、回报欠账未清零。',
          },
          production_failed_requirements: [
            { key: 'default_lane_segment_duty', label: '默认档位段位职责', failure_reason: '核心偏移', chapter_nos: [114, 115, 116] },
            { key: 'default_lane_payoff_density', label: '回报密度', failure_reason: '回报欠账', chapter_nos: [114, 115, 116] },
          ],
          repair_actions: [
            '段位职责修复：必须把默认5章职责压回主线选择。',
            '回报密度修复：必须把真实生产欠账改成可见结算。',
          ],
        },
      },
    })

    expect(prompt).toContain('【默认档位模板生产后验】')
    expect(prompt).toContain('模板版本：safe_batch_expansion_structure_repair:668')
    expect(prompt).toContain('真实复发批：第109、110、111、112、113章')
    expect(prompt).toContain('前置恢复批：第104、105、106、107、108章')
    expect(prompt).toContain('前置验证批：第96、97、98章')
    expect(prompt).toContain('本轮验证批：第114、115、116章')
    expect(prompt).toContain('仍复发维度：核心偏移、回报欠账')
    expect(prompt).toContain('已修复维度：追读拉力')
    expect(prompt).toContain('生产失败项：默认档位段位职责/核心偏移：第114、115、116章')
    expect(prompt).toContain('生产失败项：回报密度/回报欠账：第114、115、116章')
    expect(prompt).toContain('关闭口径：下一轮3章验证批必须输出 production_relapse_verdict.status=passed')
    expect(prompt).toContain('不能只补 default_lane_*_delivered 字段')
  })

  test('injects default lane template redesign queue into structure repair prompts', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'safe_batch_expansion_structure_repair',
      severity: 'high',
      message: '默认档位模板稳定性画像要求升级模板重构。',
      action: '升级默认档位模板重构：重写四项模板和下一轮验证标准。',
      safe_batch_expansion_structure_review: {
        default_five_chapter_lane_template_redesign_queue: {
          visible: true,
          status: 'redesign',
          source: 'default_five_chapter_lane_template_stability_profile',
          recommendation: 'escalate_template_redesign',
          label: '默认档位模板重构队列',
          summary: '默认档位模板同项复发，回报密度失败 2 次，需要升级模板重构。',
          latest_chapter_nos: [93, 94, 95],
          validation_batch_count: 2,
          failed_batch_count: 2,
          top_failed_requirement: {
            key: 'default_lane_payoff_density',
            label: '回报密度',
            failed_count: 2,
          },
          redesign_requirements: [
            { key: 'default_lane_segment_duty', label: '默认档位段位职责', instruction: '重写每章在5章档位中的前段/中段/后段职责。' },
            { key: 'default_lane_conflict_rotation', label: '冲突轮换', instruction: '重写规则压迫、人物对抗、信息误导的轮换顺序。' },
            { key: 'default_lane_payoff_density', label: '回报密度', instruction: '重写每章显性回报预算，避免连续铺垫。' },
            { key: 'default_lane_ending_hook_template', label: '章末追读模板', instruction: '重写最后300字触发事件、读者问题和下一章风险。' },
          ],
          validation_standard: [
            '下一轮3章验证批必须逐章回填 default_lane_*_delivered。',
            '连续2批模板全过后才能恢复默认5章档位。',
          ],
        },
      },
    })

    expect(prompt).toContain('【默认档位模板重构队列】')
    expect(prompt).toContain('稳定性画像：默认档位模板同项复发，回报密度失败 2 次')
    expect(prompt).toContain('高频缺项：回报密度失败 2 次')
    expect(prompt).toContain('重构模板：默认档位段位职责：重写每章在5章档位中的前段/中段/后段职责。')
    expect(prompt).toContain('重构模板：回报密度：重写每章显性回报预算，避免连续铺垫。')
    expect(prompt).toContain('下一轮验证标准：下一轮3章验证批必须逐章回填 default_lane_*_delivered。；连续2批模板全过后才能恢复默认5章档位。')
    expect(prompt).toContain('必须先重写默认5章档位的段位职责、冲突轮换、回报密度和章末追读模板')
  })

  test('injects reader pull and innovation evidence for safe-batch repair tasks', () => {
    const readerPrompt = buildRepairTaskRevisionPrompt({
      issue_type: 'reader_pull_missed',
      message: '本章读者期待或追读漏兑现 2 项。',
      action: '补齐本章承诺的期待兑现、追读问题和下一章动力。',
      reader_pull_review: {
        missed: [
          { label: '令牌代价', text: '章内没有兑现令牌背面血字代表的即时危险。' },
          { label: '章末问题', text: '章末没有留下明确的下一章选择或危险。' },
        ],
        expectation_label: '期待欠账 1',
        retention_label: '追读漏项 1',
      },
    })

    expect(readerPrompt).toContain('【读者拉力修复】')
    expect(readerPrompt).toContain('期待欠账 1')
    expect(readerPrompt).toContain('追读漏项 1')
    expect(readerPrompt).toContain('令牌代价：章内没有兑现令牌背面血字代表的即时危险。')
    expect(readerPrompt).toContain('章末问题：章末没有留下明确的下一章选择或危险。')
    expect(readerPrompt).toContain('必须补出下一页动力')

    const innovationPrompt = buildRepairTaskRevisionPrompt({
      issue_type: 'innovation_execution_missed',
      message: '本章创新/IP化执行漏兑现 2 项。',
      action: '补齐本书差异化机制和可视化传播场面。',
      innovation_review: {
        missed: [
          { label: '规则反制新鲜感', text: '没有把阵法规则写成可视化反制场面。' },
          { label: 'IP化场面', text: '缺少适合短剧/漫剧化的强视觉场景。' },
        ],
        label: '创新缺口 2',
      },
    })

    expect(innovationPrompt).toContain('【创新/IP化执行】')
    expect(innovationPrompt).toContain('创新缺口 2')
    expect(innovationPrompt).toContain('规则反制新鲜感：没有把阵法规则写成可视化反制场面。')
    expect(innovationPrompt).toContain('IP化场面：缺少适合短剧/漫剧化的强视觉场景。')
    expect(innovationPrompt).toContain('必须写成读者能复述的差异化体验')
  })

  test('injects oh-story post batch quality warnings for safe-batch repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'post_batch_quality_warning',
      message: 'oh-story 批次交稿后质检仍有 2 项未闭环。',
      action: '按批次质检摘要回修本批正文、伏笔增量、正文元信息、细纲兑现和状态机更新。',
      post_batch_quality_check: {
        source: 'oh_story_step_3',
        status: 'warn',
        chapter_nos: [8, 9, 10],
        average_score: 85,
        revised_count: 1,
        checks: [
          { key: 'title_uniqueness', label: '标题去重', status: 'warn', checked_count: 3, warn_count: 1, summaries: ['第8章《暗门》与第3章标题重复'] },
          { key: 'prose_meta', label: '正文元信息', status: 'warn', checked_count: 3, warn_count: 1, summaries: ['第9章仍残留作者说明'] },
          { key: 'chapter_hook', label: '章尾钩子', status: 'warn', checked_count: 3, warn_count: 1, summaries: ['第10章章尾没有形成下一章选择或危险'] },
          { key: 'blueprint_consumption', label: '细纲兑现', status: 'warn', checked_count: 3, warn_count: 1, summaries: ['第9章没有兑现人物出场顺序和代价/收益'] },
          { key: 'banned_words', label: '禁用词扫描', status: 'warn', checked_count: 3, warn_count: 1, summaries: ['第8章命中“眼中闪过一丝”模板表达'] },
          { key: 'foreshadowing_delta', label: '伏笔增量', status: 'warn', checked_count: 3, warn_count: 1, summaries: ['第10章新增令牌伏笔未写入状态'] },
          { key: 'deterministic_cleanup', label: '确定性清理', status: 'warn', checked_count: 3, warn_count: 1, summaries: ['第8章仍有长省略号和 AI 句式'] },
          { key: 'story_state', label: '状态机更新', status: 'warn', checked_count: 3, warn_count: 1, summaries: ['第9章角色伤势和钥匙归属没有写回状态'] },
        ],
      },
    })

    expect(prompt).toContain('【oh-story批次质检回修】')
    expect(prompt).toContain('来源：oh_story_step_3')
    expect(prompt).toContain('批次章节：第8、9、10章')
    expect(prompt).toContain('平均质检分：85')
    expect(prompt).toContain('已修订章节：1')
    expect(prompt).toContain('只修 warn 项')
    expect(prompt).toContain('不得重写已通过章节或检查项')
    expect(prompt).toContain('不得改动批次外章节')
    expect(prompt).toContain('标题去重：第8章《暗门》与第3章标题重复')
    expect(prompt).toContain('同步细纲标题与正文文件名')
    expect(prompt).toContain('正文元信息：第9章仍残留作者说明')
    expect(prompt).toContain('上一章/本章/前文/后文/伏笔/细纲/读者')
    expect(prompt).toContain('角色当下能感知的事件锚点')
    expect(prompt).toContain('章尾钩子：第10章章尾没有形成下一章选择或危险')
    expect(prompt).toContain('收束状态、未解决问题和下一章推动力')
    expect(prompt).toContain('细纲兑现：第9章没有兑现人物出场顺序和代价/收益')
    expect(prompt).toContain('内容概括五段式')
    expect(prompt).toContain('爽点前危机/期待铺垫')
    expect(prompt).toContain('禁用词扫描：第8章命中“眼中闪过一丝”模板表达')
    expect(prompt).toContain('一级禁用词/模板表达')
    expect(prompt).toContain('复扫为 0')
    expect(prompt).toContain('伏笔增量：第10章新增令牌伏笔未写入状态')
    expect(prompt).toContain('不得做全书伏笔审计')
    expect(prompt).toContain('MangaForge 确定性清理阶段')
    expect(prompt).toContain('deterministic_prose_cleanup')
    expect(prompt).toContain('risk_count 为 0')
    expect(prompt).not.toContain('node scripts/normalize-punctuation.js')
    expect(prompt).not.toContain('node scripts/check-ai-patterns.js --check')
    expect(prompt).toContain('状态机更新：第9章角色伤势和钥匙归属没有写回状态')
    expect(prompt).toContain('state_delta')
    expect(prompt).toContain('角色状态、伏笔、时间线和资产状态')
    expect(prompt).toContain('source_excerpt')
    expect(prompt).toContain('post_batch_quality_check.status 为 ok')
    expect(prompt).toContain('所有 warn_count 清零')
  })

  test('injects oh-story single chapter post-delivery quality context for unattended repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'unattended_post_delivery_quality',
      task_type: 'repair_quality',
      issue_type: 'prose_meta_gap',
      annotation_category: 'prose_meta',
      chapter_no: 9,
      message: '第9章仍残留作者说明。',
      action: '删除正文中的上一章/本章/伏笔/读者等元叙事词，改成角色当下可感知的事件锚点。',
      post_delivery_quality: {
        source: 'oh_story_step_3',
        status: 'warn',
        score: 82,
        check: {
          key: 'prose_meta',
          label: '正文元信息',
          status: 'warn',
          summary: '第9章仍残留作者说明。',
          warn_count: 1,
        },
      },
      acceptance_criteria: [
        '正文元信息复检状态为 ok。',
        '重新运行当前章节交付后质检后，post_delivery_quality.checks 中该项不再为 warn/unknown。',
        '确认 Step 3 全部 ok 后，再继续无人值守下一章。',
      ],
    })

    expect(prompt).toContain('【oh-story单章交付后质检回修】')
    expect(prompt).toContain('来源：oh_story_step_3')
    expect(prompt).toContain('目标章节：第9章')
    expect(prompt).toContain('交付后质检状态：warn')
    expect(prompt).toContain('交付后质检分：82')
    expect(prompt).toContain('质检项：正文元信息')
    expect(prompt).toContain('质检键：prose_meta')
    expect(prompt).toContain('质检摘要：第9章仍残留作者说明。')
    expect(prompt).toContain('修复动作：删除正文中的上一章/本章/伏笔/读者等元叙事词')
    expect(prompt).toContain('只修当前 Step 3 质检项')
    expect(prompt).toContain('不得把单章修复扩大成批次重写')
    expect(prompt).toContain('输出要求：必须返回 post_delivery_quality.status、post_delivery_quality.score、post_delivery_quality.checks')
    expect(prompt).toContain('post_delivery_quality.checks 每项必须包含 key, label, status, warn_count, unknown_count, fail_count, error_count, summary')
    expect(prompt).toContain('所有 post_delivery_quality.checks 都必须复检为 ok/pass/passed')
    expect(prompt).toContain('post_delivery_quality.checks 中该项复检为 ok')
    expect(prompt).toContain('确认 Step 3 全部 ok 后，再继续无人值守下一章')
  })

  test('injects title uniqueness repair rules for single chapter title tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'title_uniqueness_gap',
      annotation_category: 'title_uniqueness',
      message: '第8章《暗门》与第3章标题重复。',
      action: '按本章核心事件重新命名，并同步细纲标题和正文文件名。',
      title_uniqueness_sync: {
        label: '标题重复 1',
        missed: [
          {
            label: '重复标题',
            text: '第8章《暗门》与第3章标题重复。',
            fix: '改成体现本章核心事件的标题，例如《湿校牌》。',
          },
        ],
        next_actions: ['同步细纲标题与正文文件名，不能只改展示标题。'],
      },
    })

    expect(prompt).toContain('【标题去重修复】')
    expect(prompt).toContain('标题重复 1')
    expect(prompt).toContain('重复标题：第8章《暗门》与第3章标题重复。')
    expect(prompt).toContain('按本章核心事件重新命名重复章节')
    expect(prompt).toContain('同步细纲标题与正文文件名')
    expect(prompt).toContain('不得只改任务说明、展示标题或章节正文第一行')
    expect(prompt).toContain('输出要求：必须返回 title_uniqueness_checks')
    expect(prompt).toContain('title_uniqueness_checks 每项必须包含 key, label, status, old_title, new_title, outline_title_synced, file_name_synced, chapter_title_line_synced, evidence, remaining_risk')
    expect(prompt).toContain('细纲标题、正文文件名或正文标题行未同步时 status 不能写 pass/ok')
    expect(prompt).toContain('title_uniqueness_checks')
  })

  test('uses category aliases to build targeted reader retention repair prompts', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      annotation_category: 'reader_retention',
      message: '本章追读钩子没有形成下一章压力。',
      action: '补出章末危险选择和未解问题。',
    })

    expect(prompt).toContain('问题类型：reader_retention_missed')
    expect(prompt).toContain('【读者拉力修复】')
    expect(prompt).toContain('追读钩子：本章追读钩子没有形成下一章压力。')
    expect(prompt).toContain('必须补出下一页动力')
    expect(prompt).toContain('输出要求：必须返回 reader_retention_checks')
    expect(prompt).toContain('reader_retention_checks 每项必须包含 key, label, status, retention_engine, emotional_payoff, information_hunger, page_turn_question, evidence, fix, remaining_risk')
    expect(prompt).toContain('缺少情绪回报、信息差饥饿或章末追读证据时 status 不能写 pass/ok')
  })

  test('uses category aliases to build targeted innovation repair prompts', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      annotation_category: 'innovation',
      message: '本章差异化机制没有转成可视化反制场面。',
      action: '补出能被读者复述的规则反制和传播画面。',
    })

    expect(prompt).toContain('问题类型：innovation_missed')
    expect(prompt).toContain('【创新/IP化执行】')
    expect(prompt).toContain('创新复盘：本章差异化机制没有转成可视化反制场面。')
    expect(prompt).toContain('修复动作：补出能被读者复述的规则反制和传播画面。')
    expect(prompt).toContain('必须写成读者能复述的差异化体验')
    expect(prompt).toContain('输出要求：必须返回 innovation_checks')
    expect(prompt).toContain('innovation_checks 每项必须包含 key, label, status, innovation_type, differentiating_mechanism, visualized_scene, reader_retellable_hook, long_term_fit, evidence, fix, remaining_risk')
    expect(prompt).toContain('只是重命名术语、没有可复述场面或没有正文证据时 status 不能写 pass/ok')
  })

  test('injects chapter attraction evidence for attraction repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'chapter_attraction_gap',
      message: '本章有 3 项章节吸引力缺口。',
      action: '按吸引力执行器重修开篇钩子、场景推进、爽点密度、章末翻页和传播场面。',
      chapter_attraction_review: {
        score: 62,
        label: '吸引力缺口 3',
        priority_repair: '优先修章末翻页',
        dimensions: [
          { key: 'payoff_density', label: '爽点密度', status: 'warn', score: 58, issue: '爽点没有写成可见反制结果' },
          { key: 'page_turn', label: '章末翻页', status: 'warn', score: 42, issue: '结尾没有留下下一章必须看的问题' },
        ],
      },
    })

    expect(prompt).toContain('【章节吸引力修复】')
    expect(prompt).toContain('吸引力评分：62')
    expect(prompt).toContain('优先修章末翻页')
    expect(prompt).toContain('爽点密度：爽点没有写成可见反制结果')
    expect(prompt).toContain('章末翻页：结尾没有留下下一章必须看的问题')
    expect(prompt).toContain('必须同时补强开篇钩子、场景目标/阻碍/转折/回报、爽点密度、章末翻页和可传播场面')
    expect(prompt).toContain('输出要求：必须返回 chapter_attraction_checks')
    expect(prompt).toContain('chapter_attraction_checks 每项必须包含 key, label, status, attraction_dimension, opening_hook, scene_goal_obstacle_turn_reward, payoff_density, ending_page_turn, spreadable_scene, evidence, fix, remaining_risk')
    expect(prompt).toContain('开篇钩子、场景推进、爽点密度、章末翻页或可传播场面缺证据时 status 不能写 pass/ok')
  })

  test('injects story drive evidence for protagonist choice repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'story_drive_gap',
      message: '本章故事驱动力缺口 3 项。',
      action: '补出主角选择、选择代价和状态变化。',
      story_drive_sync: {
        score: 60,
        label: '故事力缺口 3',
        priority_repair: '优先补主角选择',
        missed: [
          { label: '主角选择', text: '主角当众选择用残阵反证阵图归属' },
          { label: '选择代价', text: '暴露阵盘裂纹，招来内门势力注意' },
          { label: '状态变化', text: '主角从被动挨压转为主动入局' },
        ],
      },
    })

    expect(prompt).toContain('【故事驱动力修复】')
    expect(prompt).toContain('故事力评分：60')
    expect(prompt).toContain('优先补主角选择')
    expect(prompt).toContain('主角选择：主角当众选择用残阵反证阵图归属')
    expect(prompt).toContain('选择代价：暴露阵盘裂纹，招来内门势力注意')
    expect(prompt).toContain('状态变化：主角从被动挨压转为主动入局')
    expect(prompt).toContain('必须补出主角主动选择、明确阻碍、选择代价、局面变化和下一步因果')
    expect(prompt).toContain('输出要求：必须返回 story_drive_checks')
    expect(prompt).toContain('story_drive_checks 每项必须包含 key, label, status, protagonist_choice, obstacle, cost, state_change, next_causality, evidence, fix, remaining_risk')
    expect(prompt).toContain('主角主动选择、明确阻碍、选择代价、局面变化或下一步因果没有正文证据时 status 不能写 pass/ok')
  })

  test('injects word count repair rules for under-target chapters', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'word_count_gap',
      annotation_category: 'word_count',
      message: '本章字数 3200，低于目标 4500 的 90%。',
      action: '按目标字数扩充正文。',
      word_count_sync: {
        label: '字数不足',
        current_count: 3200,
        target_count: 4500,
        min_required_count: 4050,
        missed: [
          { label: '字数不足', text: '当前 3200 字，低于最低 4050 字。' },
        ],
      },
    })

    expect(prompt).toContain('【字数验证修复】')
    expect(prompt).toContain('当前字数：3200')
    expect(prompt).toContain('目标字数：4500')
    expect(prompt).toContain('最低门槛：4050')
    expect(prompt).toContain('低于目标 90% 时必须强制扩充')
    expect(prompt).toContain('优先扩充场景目标、阻碍、动作链、对白交锋、代价反馈和章末承接')
    expect(prompt).toContain('不得只堆说明、环境描写或心理旁白凑字数')
    expect(prompt).toContain('输出要求：必须返回 word_count_checks')
    expect(prompt).toContain('word_count_checks 每项必须包含 key, label, status, current_count, target_count, min_required_count, evidence, remaining_risk')
    expect(prompt).toContain('低于最低门槛时 status 不能写 pass/ok')
    expect(prompt).toContain('word_count_checks')
  })

  test('injects character arc evidence for growth repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'character_arc_gap',
      message: '本章人物弧光缺口 3 项。',
      action: '补出角色欲望、缺陷受压和成长节点。',
      character_arc_sync: {
        score: 58,
        label: '人物弧光缺口 3',
        priority_repair: '优先补成长节点',
        missed: [
          { label: '角色欲望', text: '沈砚想保住试炼资格并证明阵图属于自己' },
          { label: '缺陷受压', text: '害怕暴露阵盘裂纹，只想继续藏拙' },
          { label: '成长节点', text: '第一次主动承认残阵缺陷' },
        ],
      },
    })

    expect(prompt).toContain('【人物弧光修复】')
    expect(prompt).toContain('人物弧光评分：58')
    expect(prompt).toContain('优先补成长节点')
    expect(prompt).toContain('角色欲望：沈砚想保住试炼资格并证明阵图属于自己')
    expect(prompt).toContain('缺陷受压：害怕暴露阵盘裂纹，只想继续藏拙')
    expect(prompt).toContain('成长节点：第一次主动承认残阵缺陷')
    expect(prompt).toContain('必须补出角色欲望、缺陷受压、关系变化、成长节点和口吻锚点')
    expect(prompt).toContain('输出要求：必须返回 character_arc_checks')
    expect(prompt).toContain('character_arc_checks 每项必须包含 key, label, status, character, desire, flaw_pressure, relationship_change, growth_beat, voice_anchor, evidence, fix, remaining_risk')
    expect(prompt).toContain('角色欲望、缺陷受压、关系变化、成长节点或口吻锚点没有正文证据时 status 不能写 pass/ok')
  })

  test('injects style sample evidence for style repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'style_sample_gap',
      message: '本章风格样章执行缺口 2 项，且存在照搬风险。',
      action: '按风格样章重修叙述节奏、句式密度、对白比例和角色口吻。',
      style_sample_sync: {
        score: 61,
        label: '风格缺口 2',
        missed: [
          { label: '叙述节奏', text: '先压迫，再拆规则，再小反打' },
          { label: '对白比例', text: '35%-45%' },
        ],
        copied_phrases: ['这破学校连晚自习都外包给影子了'],
      },
    })

    expect(prompt).toContain('【风格样章修复】')
    expect(prompt).toContain('风格评分：61')
    expect(prompt).toContain('风格缺口 2')
    expect(prompt).toContain('叙述节奏：先压迫，再拆规则，再小反打')
    expect(prompt).toContain('对白比例：35%-45%')
    expect(prompt).toContain('照搬风险：这破学校连晚自习都外包给影子了')
    expect(prompt).toContain('必须重写为作者口吻的节奏、句式、对白比例和情绪转折，不得照搬样章原句')
    expect(prompt).toContain('输出要求：必须返回 style_sample_checks')
    expect(prompt).toContain('style_sample_checks 每项必须包含 key, label, status, style_dimension, source_technique, adapted_evidence, copied_phrase_rewritten, fix, remaining_risk')
    expect(prompt).toContain('照搬样章原句、桥段、专有设定、角色名或核心梗时 status 不能写 pass/ok')
    expect(prompt).toContain('pre_draft_execution_receipts')
    expect(prompt).toContain('style_sample_checks')
    expect(prompt).toContain('oh_story_delivery_receipts.pre_draft_execution_receipts.style_sample_checks')
  })

  test('injects chapter benchmark evidence for benchmark repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'chapter_benchmark_gap',
      message: '本章标杆章执行缺口 3 项。',
      action: '按章节标杆重修本章结构。',
      chapter_benchmark_sync: {
        score: 57,
        label: '基准缺口 3',
        missed: [
          { label: '开篇钩子', text: '前300字没有把上一章压力转成现场危险' },
          { label: '爽点兑现', text: '主角反制没有形成可见回报' },
          { label: '章末追读', text: '章末缺少下一章非看不可的问题' },
        ],
        next_actions: ['优先补足开篇、爽点和章末追读。'],
      },
    })

    expect(prompt).toContain('【章节标杆修复】')
    expect(prompt).toContain('标杆评分：57')
    expect(prompt).toContain('基准缺口 3')
    expect(prompt).toContain('开篇钩子：前300字没有把上一章压力转成现场危险')
    expect(prompt).toContain('爽点兑现：主角反制没有形成可见回报')
    expect(prompt).toContain('章末追读：章末缺少下一章非看不可的问题')
    expect(prompt).toContain('优先补足开篇、爽点和章末追读。')
    expect(prompt).toContain('必须补成可见的开篇钩子、冲突推进、爽点兑现、场景节拍和章末追读')
    expect(prompt).toContain('输出要求：必须返回 chapter_benchmark_checks')
    expect(prompt).toContain('chapter_benchmark_checks 每项必须包含 key, label, status, benchmark_dimension, expected_method, delivered_evidence, originality_guard, fix, remaining_risk')
    expect(prompt).toContain('开篇钩子、冲突推进、爽点兑现、场景节拍或章末追读没有正文证据时 status 不能写 pass/ok')
  })

  test('injects intent confirmation evidence for pre-draft repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'intent_confirmation_gap',
      message: '写前意图没有落到正文。',
      action: '补足情绪目标和章尾承接。',
      intent_confirmation_sync: {
        score: 59,
        label: '意图确认缺口 2',
        missed: [
          { label: '情绪目标', text: '本章没有从压抑转为当众夺回主动权。' },
          { label: '章尾承接', text: '带血腰牌没有成为下一章推动力。' },
        ],
        next_actions: ['把情绪转折写成现场选择，把腰牌落成章末钩子。'],
      },
    })

    expect(prompt).toContain('【写前意图确认修复】')
    expect(prompt).toContain('意图评分：59')
    expect(prompt).toContain('意图确认缺口 2')
    expect(prompt).toContain('情绪目标：本章没有从压抑转为当众夺回主动权。')
    expect(prompt).toContain('章尾承接：带血腰牌没有成为下一章推动力。')
    expect(prompt).toContain('把情绪转折写成现场选择，把腰牌落成章末钩子。')
    expect(prompt).toContain('必须把写前确认的情绪目标、章节意图、关键承接和章尾推动力改成正文可见事件')
    expect(prompt).toContain('输出要求：必须返回 intent_confirmation_checks')
    expect(prompt).toContain('intent_confirmation_checks 每项必须包含 key, label, status, intent_field, expected_intent, delivered_evidence, blueprint_link, fix, remaining_risk')
    expect(prompt).toContain('情绪目标、章节意图、关键承接、章尾推动力或新版细纲字段没有正文证据时 status 不能写 pass/ok')
  })

  test('requires pre-draft execution receipts after intent confirmation repair', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'intent_confirmation_gap',
      message: '写前意图没有落到正文。',
      action: '补足情绪目标和章尾承接。',
      intent_confirmation_sync: {
        missed: [
          { label: '情绪目标', text: '本章没有从压抑转为当众夺回主动权。' },
        ],
      },
    })

    expect(prompt).toContain('pre_draft_execution_receipts')
    expect(prompt).toContain('intent_confirmation_checks')
    expect(prompt).toContain('delivered=true')
    expect(prompt).toContain('remaining_risk 为空')
  })

  test('injects new blueprint and craft obligations for intent confirmation repairs', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'intent_confirmation_gap',
      message: '新版细纲字段没有进入写前意图。',
      action: '按新版细纲重建本章意图。',
      intent_confirmation_sync: {
        score: 57,
        label: '新版细纲意图缺口',
        blueprint_focus: {
          content_summary: '起因=账单暴露；发展=逼问；转折=反证；高潮=公开代价；结尾=腰牌落地。',
          plot_arrangement: '主线追证据，辅线压关系，逻辑线从发现到反证。',
          character_order: '林晓先入场，周远后发声，围观学生分层反应。',
          plot_detail: '代价是旧钥匙暴露，收益是拿回搜查主动权。',
          ending_hook: '带血腰牌指向下一章禁门。',
        },
      },
    })

    expect(prompt).toContain('新版细纲意图：内容概括决定起承转合')
    expect(prompt).toContain('情节安排决定主线/辅线/事件线/感情线/逻辑线的取舍')
    expect(prompt).toContain('人物关系和出场顺序决定镜头进入顺序')
    expect(prompt).toContain('情节细化决定代价兑现/收益兑现')
    expect(prompt).toContain('结尾设定和钩子决定章尾承接')
    expect(prompt).toContain('内容概括：起因=账单暴露')
    expect(prompt).toContain('情节安排：主线追证据')
    expect(prompt).toContain('人物关系/出场顺序：林晓先入场')
    expect(prompt).toContain('情节细化：代价是旧钥匙暴露')
    expect(prompt).toContain('结尾设定和钩子：带血腰牌指向下一章禁门')
    expect(prompt).toContain('爽点出手前先铺可指认的危机/期待')
    expect(prompt).toContain('装逼/打脸/揭露章必须通过在场配角放大信息差和差异化反应')
    expect(prompt).toContain('高压/生死/悲痛 beat 下搞笑担当和轻快配角声线让位')
  })

  test('injects write preparation evidence for pre-draft repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'write_preparation_gap',
      annotation_category: 'write_preparation',
      message: '写前准备卡没有落到正文。',
      action: '补齐来源缺口、资产风险和创作契约。',
      write_preparation_sync: {
        score: 58,
        label: '写前准备缺口 3',
        missed: [
          { label: '来源缺口', text: '上一章门外黑影压迫没有在前300字承接。' },
          { label: '资产风险', text: '旧钥匙仍未和禁门规则建立现场关系。' },
          { label: '创作契约清单', text: '目标读者和追读留存没有正文证据。' },
        ],
        next_actions: ['把黑影压力写进开篇，把旧钥匙功能写成现场代价。'],
      },
    })

    expect(prompt).toContain('【写前准备卡修复】')
    expect(prompt).toContain('写前准备评分：58')
    expect(prompt).toContain('写前准备缺口 3')
    expect(prompt).toContain('来源缺口：上一章门外黑影压迫没有在前300字承接。')
    expect(prompt).toContain('资产风险：旧钥匙仍未和禁门规则建立现场关系。')
    expect(prompt).toContain('创作契约清单：目标读者和追读留存没有正文证据。')
    expect(prompt).toContain('source_gaps、asset_risks、delivery_risk_actions')
    expect(prompt).toContain('creation_contract_checklist')
    expect(prompt).toContain('目标读者、题材定位、核心承诺、追读留存')
    expect(prompt).toContain('输出要求：必须返回 write_preparation_checks')
    expect(prompt).toContain('write_preparation_checks 每项必须包含 key, label, status, preparation_type, expected, delivered_evidence, chapter_location, fix, remaining_risk')
    expect(prompt).toContain('写前准备项没有落成正文动作、对白、信息变化、关系变化、物品状态变化或章末承接时 status 不能写 pass/ok')
  })

  test('requires pre-draft execution receipts after write preparation repair', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'write_preparation_gap',
      annotation_category: 'write_preparation',
      message: '写前准备卡没有落到正文。',
      action: '补齐来源缺口、资产风险和创作契约。',
      write_preparation_sync: {
        missed: [
          { label: '资产风险', text: '旧钥匙仍未和禁门规则建立现场关系。' },
        ],
      },
    })

    expect(prompt).toContain('pre_draft_execution_receipts')
    expect(prompt).toContain('write_preparation_checks')
    expect(prompt).toContain('delivered=true')
    expect(prompt).toContain('remaining_risk 为空')
  })

})
