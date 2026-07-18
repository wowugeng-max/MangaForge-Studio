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

  test('injects benchmark recall evidence for pre-draft repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'benchmark_recall_gap',
      message: '文风召回没有落到正文。',
      action: '补足节奏参照。',
      benchmark_recall_sync: {
        score: 62,
        label: '文风召回缺口 1',
        missed: [
          { label: '节奏参照', text: '爆发后没有冷却承接，直接跳到总结。' },
        ],
        next_actions: ['补出爆发后的短冷却、关系反馈和下一步压力。'],
      },
    })

    expect(prompt).toContain('【文风召回修复】')
    expect(prompt).toContain('召回评分：62')
    expect(prompt).toContain('文风召回缺口 1')
    expect(prompt).toContain('节奏参照：爆发后没有冷却承接，直接跳到总结。')
    expect(prompt).toContain('补出爆发后的短冷却、关系反馈和下一步压力。')
    expect(prompt).toContain('必须把对标模块、节奏参照、文风召回和表达方法改成正文中的节拍分配、对白比例、动作链和情绪转折')
    expect(prompt).toContain('输出要求：必须返回 benchmark_recall_checks')
    expect(prompt).toContain('benchmark_recall_checks 每项必须包含 key, label, status, source_type, source_path, expected_application, delivered_evidence, gaps_preserved, fix, remaining_risk')
    expect(prompt).toContain('对标模块、节奏参照、文风召回或匹配章技巧没有正文证据时 status 不能写 pass/ok')
  })

  test('requires pre-draft execution receipts after benchmark recall repair', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'benchmark_recall_gap',
      message: '文风召回没有落到正文。',
      action: '补足节奏参照。',
      benchmark_recall_sync: {
        missed: [
          { label: '节奏参照', text: '爆发后没有冷却承接，直接跳到总结。' },
        ],
      },
    })

    expect(prompt).toContain('pre_draft_execution_receipts')
    expect(prompt).toContain('benchmark_recall_checks')
    expect(prompt).toContain('delivered=true')
    expect(prompt).toContain('remaining_risk 为空')
  })

  test('injects benchmark recall sources and gap preservation rules', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'benchmark_recall_gap',
      message: '对标召回没有按权威模块执行。',
      action: '按情绪模块和节奏参照重修正文。',
      benchmark_recall_sync: {
        score: 58,
        label: '对标召回来源缺口',
        style_profile_path: '对标/鬼校/文风.md',
        style_profile_summary: '短句压迫、对白问非所答、章末留未解危险。',
        selected_emotion_module: 'M03 信息差反杀：先压住证据，再公开翻盘。',
        rhythm_reference: '爆发前铺危机，爆发后用一段冷却承接下一钩子。',
        module_source_path: '对标/鬼校/剧情/情绪模块.md',
        rhythm_source_path: '对标/鬼校/剧情/节奏.md',
        matched_chapter_K: 7,
        matched_chapter_techniques: ['问非所答推进压迫', '短动作切掉解释'],
        anchor_excerpts: ['他没回答，只把湿透的校牌按在桌上。'],
        gaps: {
          conflict: true,
          module_rhythm_conflict: true,
          matched_deep_dive_missing: true,
        },
      },
    })

    expect(prompt).toContain('情绪模块来源：对标/鬼校/剧情/情绪模块.md')
    expect(prompt).toContain('节奏来源：对标/鬼校/剧情/节奏.md')
    expect(prompt).toContain('文风来源：对标/鬼校/文风.md')
    expect(prompt).toContain('匹配章节：第7章')
    expect(prompt).toContain('情绪模块：M03 信息差反杀')
    expect(prompt).toContain('节奏参照：爆发前铺危机')
    expect(prompt).toContain('匹配章技巧：问非所答推进压迫；短动作切掉解释')
    expect(prompt).toContain('召回 gaps：conflict=true；module_rhythm_conflict=true；matched_deep_dive_missing=true')
    expect(prompt).toContain('剧情/情绪模块.md 和 剧情/节奏.md 是权威来源')
    expect(prompt).toContain('不得把 gaps.conflict 或 matched_deep_dive_missing 在回执里反转为 false')
  })

  test('injects source readiness evidence for state filtering repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'source_readiness_gap',
      annotation_category: 'source_readiness',
      message: '来源就绪存在缺口。',
      action: '按 source_readiness_checks 回修正文。',
      source_readiness_sync: {
        label: '来源就绪缺口 1',
        missed: [
          {
            label: '黑色钥匙状态',
            text: '正文把黑色钥匙当成已解锁道具，但写前来源表标记为 missing。',
            fix: '先补角色确认钥匙来源和限制，再让它参与本章反制。',
          },
        ],
        next_actions: ['missing/warn 来源不能被当作既定事实，ready 来源必须在正文中可见承接。'],
      },
    })

    expect(prompt).toContain('【来源就绪修复】')
    expect(prompt).toContain('来源就绪缺口 1')
    expect(prompt).toContain('黑色钥匙状态：正文把黑色钥匙当成已解锁道具')
    expect(prompt).toContain('先补角色确认钥匙来源和限制')
    expect(prompt).toContain('missing/warn 来源不能被当作既定事实')
    expect(prompt).toContain('已加载只指本轮 workflow 内实际读取或刚更新过的来源')
    expect(prompt).toContain('不得用未标明来源的聊天记忆替代')
    expect(prompt).toContain('本章细纲、上一章正文、追踪/上下文.md、追踪/伏笔.md、追踪/时间线.md')
    expect(prompt).toContain('追踪/角色状态.md 或对应设定/角色文件')
    expect(prompt).toContain('输出要求：必须返回 source_readiness_checks')
    expect(prompt).toContain('source_readiness_checks 每项必须包含 key, label, status, source_name, source_path, read_status, used_as_fact, chapter_evidence, fix, remaining_risk')
    expect(prompt).toContain('来源未在本轮 workflow 读取或刚更新，或 missing/warn 被当作既定事实时 status 不能写 pass/ok')
    expect(prompt).toContain('source_readiness_checks')
  })

  test('requires pre-draft execution receipts after source readiness repair', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'source_readiness_gap',
      annotation_category: 'source_readiness',
      message: '来源就绪存在缺口。',
      action: '按 source_readiness_checks 回修正文。',
      source_readiness_sync: {
        missed: [
          {
            label: '黑色钥匙状态',
            text: '正文把黑色钥匙当成已解锁道具，但写前来源表标记为 missing。',
          },
        ],
      },
    })

    expect(prompt).toContain('pre_draft_execution_receipts')
    expect(prompt).toContain('source_readiness_checks')
    expect(prompt).toContain('status/evidence/fix')
    expect(prompt).toContain('missing/warn 来源')
    expect(prompt).toContain('如本任务涉及状态筛选、来源就绪、写前准备、意图确认、文风召回或样章策略')
    expect(prompt).toContain('来源就绪写入 source_readiness_checks')
  })

  test('injects state tracking evidence for state consistency repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'state_tracking_gap',
      annotation_category: 'state_tracking',
      message: '状态跟踪存在缺口。',
      action: '按 state_tracking_checks 回修正文。',
      state_tracking_sync: {
        label: '状态跟踪缺口 1',
        missed: [
          {
            label: '周远状态',
            text: '正文让周远直接出手，但上一章状态仍是昏迷未醒。',
            fix: '先补周远苏醒代价和行动限制，再参与本章选择。',
          },
        ],
        next_actions: ['昏迷、失效、未获得或未揭示状态不能直接参与当前章结果。'],
      },
    })

    expect(prompt).toContain('【状态跟踪修复】')
    expect(prompt).toContain('状态跟踪缺口 1')
    expect(prompt).toContain('周远状态：正文让周远直接出手')
    expect(prompt).toContain('先补周远苏醒代价和行动限制')
    expect(prompt).toContain('不能直接参与当前章结果')
    expect(prompt).toContain('输出要求：必须返回 state_tracking_checks')
    expect(prompt).toContain('state_tracking_checks 每项必须包含 key, label, status, state_subject, state_type, previous_state, allowed_state, used_in_chapter, evidence, excluded_reason, fix, remaining_risk')
    expect(prompt).toContain('昏迷、失效、未获得或未揭示状态被用于当前章结果时 status 不能写 pass/ok')
    expect(prompt).toContain('state_tracking_checks')
  })

  test('requires status filter receipts after state tracking repair', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'state_tracking_gap',
      annotation_category: 'state_tracking',
      message: '状态跟踪存在缺口。',
      action: '按 state_tracking_checks 回修正文。',
      state_tracking_sync: {
        missed: [
          {
            label: '周远状态',
            text: '正文让周远直接出手，但上一章状态仍是昏迷未醒。',
          },
        ],
      },
    })

    expect(prompt).toContain('pre_draft_execution_receipts')
    expect(prompt).toContain('status_filter_receipts')
    expect(prompt).toContain('used_in_chapter/evidence/excluded_reason/remaining_risk')
    expect(prompt).toContain('状态筛选')
    expect(prompt).toContain('如本任务涉及状态筛选、来源就绪、写前准备、意图确认、文风召回或样章策略')
    expect(prompt).toContain('状态筛选写入 status_filter_receipts')
  })

  test('injects story state update repair rules for tracking file sync gaps', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'story_state_update_gap',
      annotation_category: 'story_state_update',
      message: '正文新增钥匙归属变化，但追踪状态未写回。',
      action: '按 story_state_update_checks 补齐状态写回。',
      story_state_update_sync: {
        label: '状态写回缺口 2',
        missed: [
          {
            label: '角色状态',
            text: '周远伤势从昏迷变成可短暂行动，但追踪/角色状态.md 未更新。',
            fix: '补 character_updates 并带 source_excerpt。',
          },
          {
            label: '资产归属',
            text: '铜钥匙从林莹转到主角手中，但资产状态未写回。',
            fix: '补 setting_updates 或 asset_updates 并引用正文原句。',
          },
        ],
        next_actions: ['同步追踪/上下文.md、追踪/伏笔.md、追踪/时间线.md 和追踪/角色状态.md。'],
      },
    })

    expect(prompt).toContain('【状态写回修复】')
    expect(prompt).toContain('状态写回缺口 2')
    expect(prompt).toContain('周远伤势从昏迷变成可短暂行动')
    expect(prompt).toContain('铜钥匙从林莹转到主角手中')
    expect(prompt).toContain('story_state_update')
    expect(prompt).toContain('state_delta')
    expect(prompt).toContain('character_updates')
    expect(prompt).toContain('setting_updates')
    expect(prompt).toContain('storyline_updates')
    expect(prompt).toContain('追踪/上下文.md')
    expect(prompt).toContain('追踪/伏笔.md')
    expect(prompt).toContain('追踪/时间线.md')
    expect(prompt).toContain('追踪/角色状态.md')
    expect(prompt).toContain('source_excerpt/evidence')
    expect(prompt).toContain('不能只写摘要结论')
    expect(prompt).toContain('输出要求：必须返回 story_state_update_checks')
    expect(prompt).toContain('story_state_update_checks 每项必须包含 key, label, status, state_domain, target_file, update_path, before_state, after_state, source_excerpt, evidence, fix, remaining_risk')
    expect(prompt).toContain('target_file/update_path 未写回，或 source_excerpt/evidence 不能定位到修订后正文时 status 不能写 pass/ok')
    expect(prompt).toContain('story_state_update_checks')
  })

  test('injects style boundary evidence for reference-safe rewrite tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'style_boundary_gap',
      annotation_category: 'style_boundary',
      message: '风格边界存在缺口。',
      action: '按 style_boundary_checks 回修正文。',
      style_boundary_sync: {
        label: '风格边界缺口 1',
        missed: [
          {
            label: '参照句式过近',
            text: '正文连续三句沿用标杆样章的句式节奏，只有名词替换。',
            fix: '保留压迫感，但改用本章动作链和角色口吻重写。',
          },
        ],
        next_actions: ['不得复制标杆原句、专有设定或核心梗。'],
      },
    })

    expect(prompt).toContain('【风格边界修复】')
    expect(prompt).toContain('风格边界缺口 1')
    expect(prompt).toContain('参照句式过近：正文连续三句沿用标杆样章')
    expect(prompt).toContain('本章动作链和角色口吻重写')
    expect(prompt).toContain('不得复制标杆原句')
    expect(prompt).toContain('style_boundary_checks')
    expect(prompt).toContain('style_boundary_checks 每项必须包含 key, label, status, reference_risk, rewritten_with_local_action, voice_anchor, copied_phrase_removed, evidence, fix, remaining_risk')
    expect(prompt).toContain('仍复用标杆原句、句式节奏、专有设定或缺少本章动作链证据时 status 不能写 pass/ok')
  })

  test('injects information flow evidence for reveal-order repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'information_flow_gap',
      annotation_category: 'information_flow',
      message: '信息流存在缺口。',
      action: '按 information_flow_checks 回修正文。',
      information_flow_sync: {
        label: '信息流缺口 1',
        missed: [
          {
            label: '线索揭示顺序',
            text: '正文先解释封条真相，再让主角发现供词，导致悬念提前泄底。',
            fix: '先写主角误判和供词异常，再用封条真相收束本场。',
          },
        ],
        next_actions: ['信息必须跟冲突、动作、选择和代价同步释放。'],
      },
    })

    expect(prompt).toContain('【信息流修复】')
    expect(prompt).toContain('信息流缺口 1')
    expect(prompt).toContain('线索揭示顺序：正文先解释封条真相')
    expect(prompt).toContain('先写主角误判和供词异常')
    expect(prompt).toContain('同步释放')
    expect(prompt).toContain('information_flow_checks')
    expect(prompt).toContain('information_flow_checks 每项必须包含 key, label, status, reveal_order, withheld_question, action_bound_release, conflict_or_cost, evidence, fix, remaining_risk')
    expect(prompt).toContain('提前泄底、信息未随行动/冲突/代价释放或缺少正文证据时 status 不能写 pass/ok')
  })

  test('injects expectation threshold evidence for page-turn repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'expectation_threshold_gap',
      annotation_category: 'expectation_threshold',
      message: '期待阈值存在缺口。',
      action: '按 expectation_threshold_checks 回修正文。',
      expectation_threshold_sync: {
        label: '期待阈值缺口 1',
        missed: [
          {
            label: '章末追问强度',
            text: '章末只说封条异常，没有形成读者必须点下一章的具体问题。',
            fix: '把封条异常落到一个未揭身份、代价或选择压力上。',
          },
        ],
        next_actions: ['章末必须留下明确的下一章追问，不能只做氛围收束。'],
      },
    })

    expect(prompt).toContain('【期待阈值修复】')
    expect(prompt).toContain('期待阈值缺口 1')
    expect(prompt).toContain('章末追问强度：章末只说封条异常')
    expect(prompt).toContain('未揭身份、代价或选择压力')
    expect(prompt).toContain('下一章追问')
    expect(prompt).toContain('expectation_threshold_checks')
    expect(prompt).toContain('expectation_threshold_checks 每项必须包含 key, label, status, reader_question, stakes, choice_pressure, payoff_promise, next_chapter_pull, evidence, fix, remaining_risk')
    expect(prompt).toContain('缺少具体读者问题、代价/选择压力、回报承诺或下一章牵引证据时 status 不能写 pass/ok')
  })

  test('injects story loop evidence for setup-payoff repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'story_loop_gap',
      annotation_category: 'story_loop',
      message: '故事闭环存在缺口。',
      action: '按 story_loop_checks 回修正文。',
      story_loop_sync: {
        label: '故事闭环缺口 1',
        missed: [
          {
            label: '设问回收闭环',
            text: '本章开头抛出谁换了封条，但结尾没有推进答案、代价或新问题。',
            fix: '至少推进一个答案碎片，并把新问题挂到下一章钩子。',
          },
        ],
        next_actions: ['设问、阻碍、选择、代价、回报和新问题必须形成可追踪闭环。'],
      },
    })

    expect(prompt).toContain('【故事闭环修复】')
    expect(prompt).toContain('故事闭环缺口 1')
    expect(prompt).toContain('设问回收闭环：本章开头抛出谁换了封条')
    expect(prompt).toContain('推进一个答案碎片')
    expect(prompt).toContain('可追踪闭环')
    expect(prompt).toContain('story_loop_checks')
    expect(prompt).toContain('story_loop_checks 每项必须包含 key, label, status, setup_question, obstacle, choice, cost, payoff_or_answer_fragment, new_question, evidence, fix, remaining_risk')
    expect(prompt).toContain('设问、阻碍、选择、代价、回报/答案碎片或新问题缺证据时 status 不能写 pass/ok')
  })

  test('injects emotional arc evidence for pressure-release repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'emotional_arc_gap',
      annotation_category: 'emotional_arc',
      message: '情绪弧存在缺口。',
      action: '按 emotional_arc_checks 回修正文。',
      emotional_arc_sync: {
        label: '情绪弧缺口 1',
        missed: [
          {
            label: '压迫释放弧',
            text: '开场压迫后直接解释规则，没有写出调动、反制和爽感释放。',
            fix: '把压迫落到现场选择，用动作和对白完成反制，再给旁观反馈。',
          },
        ],
        next_actions: ['平静、调动、释放、爽感必须形成可追踪情绪递进。'],
      },
    })

    expect(prompt).toContain('【情绪弧修复】')
    expect(prompt).toContain('情绪弧缺口 1')
    expect(prompt).toContain('压迫释放弧：开场压迫后直接解释规则')
    expect(prompt).toContain('动作和对白完成反制')
    expect(prompt).toContain('情绪递进')
    expect(prompt).toContain('emotional_arc_checks')
    expect(prompt).toContain('emotional_arc_checks 每项必须包含 key, label, status, calm_or_pressure, mobilization, counteraction, release, reader_payoff, evidence, fix, remaining_risk')
    expect(prompt).toContain('缺少压迫/调动、反制、释放、读者爽感或旁观反馈证据时 status 不能写 pass/ok')
  })

  test('injects chapter hook evidence for page-turn repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'chapter_hook_gap',
      annotation_category: 'chapter_hook',
      message: '章级钩子存在缺口。',
      action: '按 chapter_hook_checks 回修正文。',
      chapter_hook_sync: {
        label: '章级钩子缺口 1',
        missed: [
          {
            label: '章尾翻页钩子',
            text: '最后一幕只写封条异常，没有形成具体翻页问题或下一章压力。',
            fix: '把封条异常落到未揭身份和立即到来的选择压力上。',
          },
        ],
        next_actions: ['前100字章首钩子和最后约100字章尾翻页钩子必须同时可见。'],
      },
    })

    expect(prompt).toContain('【章级钩子修复】')
    expect(prompt).toContain('章级钩子缺口 1')
    expect(prompt).toContain('章尾翻页钩子：最后一幕只写封条异常')
    expect(prompt).toContain('未揭身份和立即到来的选择压力')
    expect(prompt).toContain('章尾翻页钩子')
    expect(prompt).toContain('输出要求：必须返回 chapter_hook_checks')
    expect(prompt).toContain('chapter_hook_checks 每项必须包含 key, label, status, hook_position, trigger, reader_question, next_chapter_pressure, delivered_evidence, fix, remaining_risk')
    expect(prompt).toContain('章首或章尾没有现场触发、具体读者问题、下一章压力和正文证据时 status 不能写 pass/ok')
    expect(prompt).toContain('chapter_hook_checks')
  })

  test('injects paragraph hook evidence for micro-hook repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'paragraph_hook_gap',
      annotation_category: 'paragraph_hook',
      message: '段落级钩子存在缺口。',
      action: '按 paragraph_hook_checks 回修正文。',
      paragraph_hook_sync: {
        label: '段落级钩子缺口 1',
        missed: [
          {
            label: '段落微推进',
            text: '连续六段只写环境和站位，没有信息、风险、情绪或关系变化。',
            fix: '加入暗牌、倒计时或对话压迫，让每3-5段产生可见变化。',
          },
        ],
        next_actions: ['每3-5段必须出现信息、风险、情绪或关系变化。'],
      },
    })

    expect(prompt).toContain('【段落级钩子修复】')
    expect(prompt).toContain('段落级钩子缺口 1')
    expect(prompt).toContain('段落微推进：连续六段只写环境和站位')
    expect(prompt).toContain('暗牌、倒计时或对话压迫')
    expect(prompt).toContain('每3-5段')
    expect(prompt).toContain('paragraph_hook_checks')
    expect(prompt).toContain('paragraph_hook_checks 每项必须包含 key, label, status, paragraph_range, hook_type, micro_change, information_or_risk_delta, emotion_or_relation_delta, evidence, fix, remaining_risk')
    expect(prompt).toContain('连续3-5段没有信息、风险、情绪或关系变化证据时 status 不能写 pass/ok')
  })

  test('injects suspense evidence for question-misdirect repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'suspense_gap',
      annotation_category: 'suspense',
      message: '悬念编排存在缺口。',
      action: '按 suspense_checks 回修正文。',
      suspense_sync: {
        label: '悬念编排缺口 1',
        missed: [
          {
            label: '疑问误导答案循环',
            text: '正文只抛出封条异常，没有给可信误导、局部答案或新期待。',
            fix: '先提出谁换封条的问题，再给假提示，章末公布一片答案并立起新问题。',
          },
        ],
        next_actions: ['疑问、误导、答案和新期待必须形成悬念循环。'],
      },
    })

    expect(prompt).toContain('【悬念编排修复】')
    expect(prompt).toContain('悬念编排缺口 1')
    expect(prompt).toContain('疑问误导答案循环：正文只抛出封条异常')
    expect(prompt).toContain('假提示')
    expect(prompt).toContain('悬念循环')
    expect(prompt).toContain('suspense_checks')
    expect(prompt).toContain('suspense_checks 每项必须包含 key, label, status, question, misdirect, partial_answer, new_expectation, evidence, fix, remaining_risk')
    expect(prompt).toContain('缺少疑问、可信误导、局部答案或新期待证据时 status 不能写 pass/ok')
  })

  test('injects asset linkage evidence for isolated asset repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'asset_linkage_gap',
      annotation_category: 'asset_linkage',
      message: '资产挂钩存在缺口。',
      action: '按 asset_linkage_checks 回修正文。',
      asset_linkage_sync: {
        label: '资产挂钩缺口 1',
        missed: [
          {
            label: '孤立资产',
            text: '旧钥匙只被点名，没有推进目标、制造阻碍、兑现伏笔或打开章尾钩子。',
            fix: '让旧钥匙触发暗格并带来锁死代价。',
          },
        ],
        next_actions: ['每个关键资产都要绑定功能、归属、触发条件、限制和后果。'],
      },
    })

    expect(prompt).toContain('【资产挂钩修复】')
    expect(prompt).toContain('资产挂钩缺口 1')
    expect(prompt).toContain('孤立资产：旧钥匙只被点名')
    expect(prompt).toContain('锁死代价')
    expect(prompt).toContain('绑定功能、归属、触发条件')
    expect(prompt).toContain('asset_linkage_checks')
    expect(prompt).toContain('asset_linkage_checks 每项必须包含 key, label, status, asset_name, function, ownership, trigger_condition, limitation, consequence, story_link, evidence, fix, remaining_risk')
    expect(prompt).toContain('资产只点名、缺功能/归属/触发/限制/后果或没有挂到目标/冲突/回报/章尾钩子时 status 不能写 pass/ok')
  })

  test('injects dialogue evidence for subtext and agenda repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'dialogue_gap',
      annotation_category: 'dialogue',
      message: '对白质量存在缺口。',
      action: '按 dialogue_checks 回修正文。',
      dialogue_sync: {
        label: '对白质量缺口 1',
        missed: [
          {
            label: '潜台词与议程',
            text: '周薄森直接解释真实目的，整段对白像说明书，没有权力博弈或信息差。',
            fix: '把真实目的改成借口、试探、回避和动作反应，让短句方成为权力上位。',
          },
        ],
        next_actions: ['对白必须推进剧情、增加期待或展示人设。'],
      },
    })

    expect(prompt).toContain('【对白质量修复】')
    expect(prompt).toContain('对白质量缺口 1')
    expect(prompt).toContain('潜台词与议程：周薄森直接解释真实目的')
    expect(prompt).toContain('短句方成为权力上位')
    expect(prompt).toContain('推进剧情、增加期待或展示人设')
    expect(prompt).toContain('dialogue_checks')
    expect(prompt).toContain('dialogue_checks 每项必须包含 key, label, status, speaker, agenda, subtext, power_shift, information_delta, character_voice, evidence, fix, remaining_risk')
    expect(prompt).toContain('对白没有议程/潜台词/权力变化/信息增量/声线差异证据时 status 不能写 pass/ok')
  })

  test('injects plot dynamics evidence for goal-obstacle-action repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'plot_dynamics_gap',
      annotation_category: 'plot_dynamics',
      message: '剧情动力存在缺口。',
      action: '按 plot_dynamics_checks 回修正文。',
      plot_dynamics_sync: {
        label: '剧情动力缺口 1',
        missed: [
          {
            label: '剧情闭环',
            text: '红色阀门没有形成目标、阻碍、行动、代价/反馈、新期待闭环。',
            fix: '先给账本编号目标和协会阻碍，再写主角行动、代价反馈和新的章末期待。',
          },
        ],
        next_actions: ['目标、阻碍、行动、代价/反馈、新期待必须闭环。'],
      },
    })

    expect(prompt).toContain('【剧情动力修复】')
    expect(prompt).toContain('剧情动力缺口 1')
    expect(prompt).toContain('剧情闭环：红色阀门没有形成目标')
    expect(prompt).toContain('账本编号目标和协会阻碍')
    expect(prompt).toContain('目标、阻碍、行动、代价/反馈、新期待')
    expect(prompt).toContain('plot_dynamics_checks')
    expect(prompt).toContain('plot_dynamics_checks 每项必须包含 key, label, status, goal, obstacle, action, cost_or_feedback, new_expectation, evidence, fix, remaining_risk')
    expect(prompt).toContain('目标、阻碍、行动、代价/反馈或新期待缺正文证据时 status 不能写 pass/ok')
  })

  test('injects character relation evidence for goal ownership repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'character_relation_gap',
      annotation_category: 'character_relation',
      message: '角色关系存在缺口。',
      action: '按 character_relation_checks 回修正文。',
      character_relation_sync: {
        label: '角色关系缺口 1',
        missed: [
          {
            label: '目标归属',
            text: '主角只是在帮林栖雨追查旧案，缺少自己的诉求、主动选择和代价。',
            fix: '把旧案改成会影响主角阵盘资格的风险，让主角主动押上名额交换线索。',
          },
        ],
        next_actions: ['关系线必须让主角保留自己的诉求、主动选择和代价。'],
      },
    })

    expect(prompt).toContain('【角色关系修复】')
    expect(prompt).toContain('角色关系缺口 1')
    expect(prompt).toContain('目标归属：主角只是在帮林栖雨追查旧案')
    expect(prompt).toContain('主角主动押上名额交换线索')
    expect(prompt).toContain('主角保留自己的诉求、主动选择和代价')
    expect(prompt).toContain('character_relation_checks')
    expect(prompt).toContain('character_relation_checks 每项必须包含 key, label, status, relation_type, protagonist_goal, agency_choice, cost, relation_shift, evidence, fix, remaining_risk')
    expect(prompt).toContain('主角缺自己的诉求、主动选择、代价或关系变化证据时 status 不能写 pass/ok')
  })

  test('injects character behavior evidence for motivation repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'character_behavior_gap',
      annotation_category: 'character_behavior',
      message: '角色行为存在缺口。',
      action: '按 character_behavior_checks 回修正文。',
      character_behavior_sync: {
        label: '角色行为缺口 1',
        missed: [
          {
            label: '动机具体性',
            text: '主角只是想变强，缺少具体起因、情感理由和动机演变铺垫。',
            fix: '把动机改成阵盘资格被夺的具体事件，并补主角为母亲旧约承担代价的情感理由。',
          },
        ],
        next_actions: ['角色行为必须有具体动机链、可见选择和代价。'],
      },
    })

    expect(prompt).toContain('【角色行为修复】')
    expect(prompt).toContain('角色行为缺口 1')
    expect(prompt).toContain('动机具体性：主角只是想变强')
    expect(prompt).toContain('阵盘资格被夺的具体事件')
    expect(prompt).toContain('具体动机链、可见选择和代价')
    expect(prompt).toContain('character_behavior_checks')
    expect(prompt).toContain('character_behavior_checks 每项必须包含 key, label, status, character, concrete_motive, emotional_reason, trigger_change, visible_choice, cost, evidence, fix, remaining_risk')
    expect(prompt).toContain('动机只写想变强/被欺负，或缺具体事件、情感理由、可见选择/代价证据时 status 不能写 pass/ok')
  })

  test('injects conflict structure evidence for no-exit repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'conflict_structure_gap',
      annotation_category: 'conflict_structure',
      message: '冲突结构存在缺口。',
      action: '按 conflict_structure_checks 回修正文。',
      conflict_structure_sync: {
        label: '冲突结构缺口 1',
        missed: [
          {
            label: '有进无出',
            text: '主角可以随时离开账房，没人阻止他拿到账本，也没有退出代价。',
            fix: '让内门执事封门并押上阵盘资格，必须完成账本核验才能脱身。',
          },
        ],
        next_actions: ['冲突必须有阻止者、有进无出、行动阻拦和明确胜负结果。'],
      },
    })

    expect(prompt).toContain('【冲突结构修复】')
    expect(prompt).toContain('冲突结构缺口 1')
    expect(prompt).toContain('有进无出：主角可以随时离开账房')
    expect(prompt).toContain('内门执事封门并押上阵盘资格')
    expect(prompt).toContain('阻止者、有进无出、行动阻拦')
    expect(prompt).toContain('conflict_structure_checks')
    expect(prompt).toContain('conflict_structure_checks 每项必须包含 key, label, status, blocker, no_exit_condition, stakes_or_exit_cost, action_block, win_loss_result, evidence, fix, remaining_risk')
    expect(prompt).toContain('缺少阻止者、有进无出条件、退出代价、行动阻拦或明确胜负证据时 status 不能写 pass/ok')
  })

  test('injects opening evidence for protagonist-entry repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'opening_gap',
      annotation_category: 'opening',
      message: '开篇设计存在缺口。',
      action: '按 opening_checks 回修正文。',
      opening_sync: {
        label: '开篇设计缺口 1',
        missed: [
          {
            label: '300字主角登场',
            text: '开头连续写宗门天气和旧史，主角第900字才出现，1000字内没有期待点。',
            fix: '第一段直接让主角被叫到验阵台，300字内亮明目标，1000字内给出阵盘资格被夺的爽点/危机。',
          },
        ],
        next_actions: ['开篇必须简单、不偏、快、爽、不平，先给主角目标和期待点。'],
      },
    })

    expect(prompt).toContain('【开篇设计修复】')
    expect(prompt).toContain('开篇设计缺口 1')
    expect(prompt).toContain('300字主角登场：开头连续写宗门天气')
    expect(prompt).toContain('阵盘资格被夺的爽点/危机')
    expect(prompt).toContain('简单、不偏、快、爽、不平')
    expect(prompt).toContain('opening_checks')
    expect(prompt).toContain('opening_checks 每项必须包含 key, label, status, protagonist_entry, first_300_goal, first_1000_expectation, opening_principle, evidence, fix, remaining_risk')
    expect(prompt).toContain('主角未在300字内登场、1000字内缺爽点/期待点或开篇仍是背景说明时 status 不能写 pass/ok')
  })

  test('injects bridge unit evidence for expectation-chain repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'bridge_unit_gap',
      annotation_category: 'bridge_unit',
      message: '桥段节奏存在缺口。',
      action: '按 bridge_unit_checks 回修正文。',
      bridge_unit_sync: {
        label: '桥段节奏缺口 1',
        missed: [
          {
            label: '连续期待',
            text: '旧城会审兑现旧期待后直接散场，章尾没有新目标，也没有高潮中埋钩子。',
            fix: '兑现账本爽点前先挂赤炉城供奉新目标，高潮中埋钩子，章尾给连续小期待。',
          },
        ],
        next_actions: ['四章一桥段必须让桥段位置、连续期待、目标推进、高潮时长和阶段衔接可见。'],
      },
    })

    expect(prompt).toContain('【桥段节奏修复】')
    expect(prompt).toContain('桥段节奏缺口 1')
    expect(prompt).toContain('连续期待：旧城会审兑现旧期待')
    expect(prompt).toContain('赤炉城供奉新目标')
    expect(prompt).toContain('四章一桥段')
    expect(prompt).toContain('bridge_unit_checks')
    expect(prompt).toContain('bridge_unit_checks 每项必须包含 key, label, status, bridge_position, old_expectation_payoff, new_expectation_seed, goal_progression, climax_hook, stage_handoff, evidence, fix, remaining_risk')
    expect(prompt).toContain('旧期待兑现后没有新期待、目标推进、高潮埋钩或阶段衔接证据时 status 不能写 pass/ok')
  })

  test('injects reversal evidence for fair-clue repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'reversal_gap',
      annotation_category: 'reversal',
      message: '反转设计存在缺口。',
      action: '按 reversal_checks 回修正文。',
      reversal_sync: {
        label: '反转设计缺口 1',
        missed: [
          {
            label: '铺垫暗示',
            text: '执事身份反转是揭示时才出现的新信息，前文没有3处公平暗示，揭示后只靠长解释说明。',
            fix: '在验印、账页错位、证人迟疑里提前埋3处暗示，揭示时用旧印反证直接改变局势。',
          },
        ],
        next_actions: ['反转必须有类型、有公平误导、有自然揭示和揭示后的影响。'],
      },
    })

    expect(prompt).toContain('【反转设计修复】')
    expect(prompt).toContain('反转设计缺口 1')
    expect(prompt).toContain('铺垫暗示：执事身份反转')
    expect(prompt).toContain('验印、账页错位、证人迟疑')
    expect(prompt).toContain('3处暗示')
    expect(prompt).toContain('reversal_checks')
    expect(prompt).toContain('reversal_checks 每项必须包含 key, label, status, reversal_type, fair_clues, misdirect, reveal_timing, impact_after_reveal, evidence, fix, remaining_risk')
    expect(prompt).toContain('缺少3处公平暗示、可信误导、自然揭示或揭示后影响证据时 status 不能写 pass/ok')
  })

  test('injects showdown evidence for payoff-release repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'showdown_gap',
      annotation_category: 'showdown',
      message: '高潮对抗存在缺口。',
      action: '按 showdown_checks 回修正文。',
      showdown_sync: {
        label: '高潮对抗缺口 1',
        missed: [
          {
            label: '爽点释放',
            text: '主角亮出旧印后执事没有受到对应压制，旁观者只统一震惊，底牌释放后没有新目标。',
            fix: '让执事当场失去审判资格，分层写友方、敌方、中立方反应，并补长老追查内库阵图的新门槛。',
          },
        ],
        next_actions: ['高潮对抗必须补爽点释放、底牌管理、三压一爆三震、舞台层级和震惊分层。'],
      },
    })

    expect(prompt).toContain('【高潮对抗修复】')
    expect(prompt).toContain('高潮对抗缺口 1')
    expect(prompt).toContain('爽点释放：主角亮出旧印')
    expect(prompt).toContain('友方、敌方、中立方')
    expect(prompt).toContain('三压一爆三震')
    expect(prompt).toContain('showdown_checks')
    expect(prompt).toContain('showdown_checks 每项必须包含 key, label, status, payoff_release, trump_card_used, pressure_layers, audience_reactions, consequence, next_threshold, evidence, fix, remaining_risk')
    expect(prompt).toContain('底牌释放后缺对应压制、三方震动、后果或新门槛证据时 status 不能写 pass/ok')
  })

  test('injects prose craft evidence for deep-limited prose repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'prose_craft_gap',
      annotation_category: 'prose_craft',
      message: '正文工艺存在缺口。',
      action: '按 prose_craft_checks 回修正文。',
      prose_craft_sync: {
        label: '正文工艺缺口 1',
        missed: [
          {
            label: '远景概括',
            text: '高潮段连续写全场死寂、所有人震惊，没有主角深度限知，也没有身体细节或环境交互承接。',
            fix: '改成主角听见审判木裂响、指尖沾到旧印冷灰，用身体动作和视线承接围观者分层反应。',
          },
        ],
        next_actions: ['正文工艺必须补深度限知、身体细节、环境交互和一动一静。'],
      },
    })

    expect(prompt).toContain('【正文工艺修复】')
    expect(prompt).toContain('正文工艺缺口 1')
    expect(prompt).toContain('远景概括：高潮段连续写全场死寂')
    expect(prompt).toContain('审判木裂响')
    expect(prompt).toContain('深度限知')
    expect(prompt).toContain('prose_craft_checks')
    expect(prompt).toContain('prose_craft_checks 每项必须包含 key, label, status, pov_depth, body_detail, environment_interaction, action_stillness_balance, crowd_reaction_layering, evidence, fix, remaining_risk')
    expect(prompt).toContain('缺少深度限知、身体细节、环境交互、一动一静或围观分层证据时 status 不能写 pass/ok')
  })

  test('injects punctuation tone evidence for voice-punctuation repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'punctuation_tone_gap',
      annotation_category: 'punctuation_tone',
      message: '语气标点存在缺口。',
      action: '按 punctuation_tone_checks 回修正文。',
      punctuation_tone_sync: {
        label: '语气标点缺口 1',
        missed: [
          {
            label: '硬停顿',
            text: '执事质问连续用“你……你竟然——”制造停顿，爆发句乱用三个感叹号，角色声线和主角一样。',
            fix: '改成执事话被审判木裂响打断，用短句和动作承接迟疑；爆发只保留一个情绪落点。',
          },
        ],
        next_actions: ['标点必须服务质问、爆发、迟疑和人物声线。'],
      },
    })

    expect(prompt).toContain('【语气标点修复】')
    expect(prompt).toContain('语气标点缺口 1')
    expect(prompt).toContain('硬停顿：执事质问连续用')
    expect(prompt).toContain('审判木裂响')
    expect(prompt).toContain('人物声线')
    expect(prompt).toContain('punctuation_tone_checks')
    expect(prompt).toContain('punctuation_tone_checks 每项必须包含 key, label, status, speaker, punctuation_issue, tone_intent, replacement, voice_difference, evidence, fix, remaining_risk')
    expect(prompt).toContain('标点未服务质问/爆发/迟疑/声线，或缺少替换后正文证据时 status 不能写 pass/ok')
  })

  test('injects content rubric evidence for golden-question repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'content_rubric_gap',
      annotation_category: 'content_rubric',
      message: '内容基准存在缺口。',
      action: '按 content_rubric_checks 回修正文。',
      content_rubric_sync: {
        label: '内容基准缺口 1',
        missed: [
          {
            label: '黄金三问',
            text: '本章没有回答读者为什么翻下一页，旧印亮出后局势没有可见变化，也缺少支持内容判断的正文证据。',
            fix: '补旧印改变审判资格、长老席追查内库阵图的新期待，并用正文动作和对白证明变化。',
          },
        ],
        next_actions: ['内容基准必须补核心卖点、冲突推进、章节变化和章末期待。'],
      },
    })

    expect(prompt).toContain('【内容基准修复】')
    expect(prompt).toContain('内容基准缺口 1')
    expect(prompt).toContain('黄金三问：本章没有回答读者为什么翻下一页')
    expect(prompt).toContain('审判资格')
    expect(prompt).toContain('本章改变了什么')
    expect(prompt).toContain('content_rubric_checks')
    expect(prompt).toContain('content_rubric_checks 每项必须包含 key, label, status, core_selling_point, conflict_progression, chapter_change, page_turn_reason, evidence, fix, remaining_risk')
    expect(prompt).toContain('缺少核心卖点、冲突推进、章节变化、翻页理由或正文证据时 status 不能写 pass/ok')
  })

  test('injects reader retention evidence for double-engine repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'reader_retention_gap',
      annotation_category: 'reader_retention',
      message: '追读雷达存在缺口。',
      action: '按 reader_retention_checks 回修正文。',
      reader_retention_check_sync: {
        label: '追读雷达缺口 1',
        missed: [
          {
            label: '留存双引擎',
            text: '本章有情绪爆发，但没有信息差植入问号，旧印来源和内库阵图线索一次性讲完，章尾没有追读饥饿。',
            fix: '把旧印来源卡到章尾，只露出内库阵图半枚残印，给长老席追查的新问题和随机额外收获。',
          },
        ],
        next_actions: ['追读雷达必须补情绪 + 饥饿、信息差问号、剥洋葱和章末追读。'],
      },
    })

    expect(prompt).toContain('【创作契约修复：追读留存】')
    expect(prompt).toContain('追读雷达缺口 1')
    expect(prompt).toContain('留存双引擎：本章有情绪爆发')
    expect(prompt).toContain('内库阵图半枚残印')
    expect(prompt).toContain('创作契约定位：修追读留存不是单独补钩子')
    expect(prompt).toContain('必须用正文证据证明情绪回报、信息差饥饿和章末追读重新闭环')
    expect(prompt).toContain('Hook上瘾模型')
    expect(prompt).toContain('reader_retention_checks')
    expect(prompt).toContain('reader_retention_checks 每项必须包含 key, label, status, retention_engine, emotional_payoff, information_hunger, page_turn_question, evidence, fix, remaining_risk')
    expect(prompt).toContain('缺少情绪回报、信息差饥饿或章末追读证据时 status 不能写 pass/ok')
  })

  test('injects target reader evidence for emotion-gap repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'target_reader_gap',
      annotation_category: 'target_reader',
      message: '目标读者存在缺口。',
      action: '按 target_reader_checks 回修正文。',
      target_reader_sync: {
        label: '目标读者缺口 1',
        missed: [
          {
            label: '情绪缺口',
            text: '目标读者画像只写年轻读者，缺核心痛苦、深层情结和未满足需求，本章旧印亮出后没有给尊严补偿。',
            fix: '把被宗门轻视的核心痛苦写成审判现场压力，用旧印反证资格并给读者尊严回报。',
          },
        ],
        next_actions: ['目标读者必须补画像、读者渴望、情绪缺口、本章命中点和平台口味。'],
      },
    })

    expect(prompt).toContain('【创作契约修复：目标读者】')
    expect(prompt).toContain('目标读者缺口 1')
    expect(prompt).toContain('情绪缺口：目标读者画像只写年轻读者')
    expect(prompt).toContain('尊严回报')
    expect(prompt).toContain('创作契约定位：修目标读者不是补人群标签')
    expect(prompt).toContain('必须用正文证据证明目标读者画像、读者渴望、情绪缺口和本章可感知回报重新对齐')
    expect(prompt).toContain('自嗨判定法')
    expect(prompt).toContain('target_reader_checks')
    expect(prompt).toContain('target_reader_checks 每项必须包含 key, label, status, target_reader_profile, reader_desire, emotion_gap, chapter_hit, platform_taste, evidence, fix, remaining_risk')
    expect(prompt).toContain('缺少目标读者画像、读者渴望、情绪缺口或本章可感知回报证据时 status 不能写 pass/ok')
  })

  test('injects genre positioning evidence for core-hook repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'genre_positioning_gap',
      annotation_category: 'genre_positioning',
      message: '题材定位存在缺口。',
      action: '按 genre_positioning_checks 回修正文。',
      genre_positioning_sync: {
        label: '题材定位缺口 1',
        missed: [
          {
            label: '核心梗',
            text: '本章挂阵修题材，但旧印只当普通信物使用，核心梗和阵法长板没有变成审判现场优势，书名简介承诺的阵师逆袭没有正文证据。',
            fix: '把旧印改成阵法资格反证，围绕阵修长板扩出识阵、破阵、反制三处正文证据。',
          },
        ],
        next_actions: ['题材定位必须校准核心梗、类型公式、题材长板和书名简介正文三位一体。'],
      },
    })

    expect(prompt).toContain('【创作契约修复：题材定位】')
    expect(prompt).toContain('题材定位缺口 1')
    expect(prompt).toContain('核心梗：本章挂阵修题材')
    expect(prompt).toContain('识阵、破阵、反制')
    expect(prompt).toContain('创作契约定位：修题材定位不是补设定说明')
    expect(prompt).toContain('必须用正文证据证明题材标签、核心梗、类型公式和题材长板重新服务本书承诺')
    expect(prompt).toContain('书名简介正文三位一体')
    expect(prompt).toContain('genre_positioning_checks')
    expect(prompt).toContain('genre_positioning_checks 每项必须包含 key, label, status, genre_tag, core_hook, type_formula, genre_strength, book_title_blurb_alignment, evidence, fix, remaining_risk')
    expect(prompt).toContain('缺少核心梗、类型公式、题材长板或书名简介正文对齐证据时 status 不能写 pass/ok')
  })

  test('injects female audience evidence for agency-security repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'female_audience_gap',
      annotation_category: 'female_audience',
      message: '女频长篇存在缺口。',
      action: '按 female_audience_checks 回修正文。',
      female_audience_sync: {
        label: '女频长篇缺口 1',
        missed: [
          {
            label: '安全感与主动性',
            text: '本章女主被长老安排着赢，缺少自己做决定的动作；旧印反转只打脸，没有安全感锚点、被珍视回馈和虐后反糖。',
            fix: '改成女主主动亮出旧印并承担代价，让盟友公开站队给安全感反馈，章尾补一颗反转后的糖。',
          },
        ],
        next_actions: ['女频长篇必须补安全感、代入感、女主主动性、感情线双轴和虐后回报。'],
      },
    })

    expect(prompt).toContain('【女频长篇修复】')
    expect(prompt).toContain('女频长篇缺口 1')
    expect(prompt).toContain('安全感与主动性：本章女主被长老安排着赢')
    expect(prompt).toContain('盟友公开站队')
    expect(prompt).toContain('感情线双轴')
    expect(prompt).toContain('female_audience_checks')
    expect(prompt).toContain('female_audience_checks 每项必须包含 key, label, status, security_anchor, reader_identification, heroine_agency, relationship_axis, post_abuse_payoff, evidence, fix, remaining_risk')
    expect(prompt).toContain('缺少女主主动性、安全感锚点、代入回馈或虐后反转/糖证据时 status 不能写 pass/ok')
  })

  test('injects upgrade rhythm evidence for progression-feedback repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'upgrade_rhythm_gap',
      annotation_category: 'upgrade_rhythm',
      message: '升级节奏存在缺口。',
      action: '按 upgrade_rhythm_checks 回修正文。',
      upgrade_rhythm_sync: {
        label: '升级节奏缺口 1',
        missed: [
          {
            label: '升级反馈与门槛',
            text: '本章获得旧印后只有奖励，没有展示升级前情绪缺口、即时反馈、延迟反馈和新门槛；金手指触发条件和升级规则不清晰。',
            fix: '补升级前被压制的情绪缺口，旧印即时改变审判资格，延迟引出更高门槛，并把金手指功能、触发、奖励和升级规则写成一眼能懂的动作反馈。',
          },
        ],
        next_actions: ['升级节奏必须补升级前后对比、即时反馈、延迟反馈、新门槛和金手指简单规则。'],
      },
    })

    expect(prompt).toContain('【升级节奏修复】')
    expect(prompt).toContain('升级节奏缺口 1')
    expect(prompt).toContain('升级反馈与门槛：本章获得旧印后只有奖励')
    expect(prompt).toContain('金手指简单是核心')
    expect(prompt).toContain('即时反馈')
    expect(prompt).toContain('upgrade_rhythm_checks')
    expect(prompt).toContain('upgrade_rhythm_checks 每项必须包含 key, label, status, before_after_contrast, instant_feedback, delayed_feedback, new_threshold, cheat_rule, evidence, fix, remaining_risk')
    expect(prompt).toContain('缺少升级前后对比、即时反馈、延迟反馈、新门槛或金手指规则证据时 status 不能写 pass/ok')
  })

  test('injects chapter structure evidence for structure repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'chapter_structure_gap',
      annotation_category: 'chapter_structure',
      message: '章节结构存在缺口。',
      action: '按 structure_checks 回修正文。',
      chapter_structure_sync: {
        label: '章节结构缺口 1',
        missed: [
          {
            label: '章节结构',
            text: '本章开头没有钩子，中段只复述旧设定，局势没有变化，结尾落在总结而不是新的发现或危机。',
            fix: '开头补具体异常，中段让旧印触发行动推进，局势从被审问变成反证成功，章尾落到新证人出现。',
          },
        ],
        next_actions: ['章节结构必须补开头钩子、中段推进、局势变化和章尾翻页。'],
      },
    })

    expect(prompt).toContain('【章节结构修复】')
    expect(prompt).toContain('章节结构缺口 1')
    expect(prompt).toContain('章节结构：本章开头没有钩子')
    expect(prompt).toContain('开头钩子、中段推进、局势变化、章尾翻页')
    expect(prompt).toContain('structure_checks')
    expect(prompt).toContain('structure_checks 每项必须包含 key, label, status, opening_hook, middle_progression, situation_change, ending_page_turn, evidence, fix, remaining_risk')
    expect(prompt).toContain('缺少开头钩子、中段推进、局势变化或章尾翻页证据时 status 不能写 pass/ok')
  })

  test('injects chapter progression evidence for water-cut repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'chapter_progression_gap',
      annotation_category: 'chapter_progression',
      message: '章节推进存在缺口。',
      action: '按 progression_checks 回修正文。',
      chapter_progression_sync: {
        label: '章节推进缺口 1',
        missed: [
          {
            label: '章节推进',
            text: '删掉这章不影响理解，主线、关系、设定都没有可见位移。',
            fix: '补本章不可删除的证据、选择、代价或关系变化，并压缩等待和复述段落。',
          },
        ],
        next_actions: ['章节推进必须证明本章不可删除，删除水文等待和旧设定复述。'],
      },
    })

    expect(prompt).toContain('【章节推进修复】')
    expect(prompt).toContain('章节推进缺口 1')
    expect(prompt).toContain('章节推进：删掉这章不影响理解')
    expect(prompt).toContain('删掉这章会影响理解')
    expect(prompt).toContain('progression_checks')
    expect(prompt).toContain('progression_checks 每项必须包含 key, label, status, non_deletable_change, mainline_shift, relationship_or_state_change, compressed_water, evidence, fix, remaining_risk')
    expect(prompt).toContain('缺少不可删除变化、主线位移、关系/状态变化或水文压缩证据时 status 不能写 pass/ok')
  })

  test('injects information load evidence for concept-overload repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'information_load_gap',
      annotation_category: 'information_load',
      message: '信息负载存在缺口。',
      action: '按 information_checks 回修正文。',
      information_load_sync: {
        label: '信息负载缺口 1',
        missed: [
          {
            label: '信息负载',
            text: '本章一次性解释三套阵法、两条宗门规则和旧印来历，信息没有跟着冲突走，读者还没看到动作就被设定淹没。',
            fix: '压缩新概念到三个以内，把旧印规则放进质疑、触发、证据核对和冲突反馈里释放。',
          },
        ],
        next_actions: ['信息负载必须压缩新概念，设定说明必须跟冲突和行动走。'],
      },
    })

    expect(prompt).toContain('【信息负载修复】')
    expect(prompt).toContain('信息负载缺口 1')
    expect(prompt).toContain('信息负载：本章一次性解释三套阵法')
    expect(prompt).toContain('一章不超 3 个新概念')
    expect(prompt).toContain('information_checks')
    expect(prompt).toContain('information_checks 每项必须包含 key, label, status, new_concept_count, action_bound_info, conflict_release, reader_first_scene, evidence, fix, remaining_risk')
    expect(prompt).toContain('新概念超过 3 个、信息没有跟行动/冲突释放或缺少正文证据时 status 不能写 pass/ok')
  })

  test('injects longform continuity evidence for serial-continuity repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'longform_continuity_gap',
      annotation_category: 'longform_continuity',
      message: '长篇连续性存在缺口。',
      action: '按 longform_checks 回修正文。',
      longform_continuity_sync: {
        label: '长篇连续性缺口 1',
        missed: [
          {
            label: '长篇连续性',
            text: '最近5章都在解释旧印背景，没有明确进展，爽点间隔过长，读者看不到阶段目标推进。',
            fix: '补最近5章的阶段位移、爽点间隔和下一阶段目标，让本章承接前文并推动后续。',
          },
        ],
        next_actions: ['长篇连续性必须检查最近5章进展、爽点间隔和下一阶段牵引。'],
      },
    })

    expect(prompt).toContain('【长篇连续性修复】')
    expect(prompt).toContain('长篇连续性缺口 1')
    expect(prompt).toContain('长篇连续性：最近5章都在解释旧印背景')
    expect(prompt).toContain('最近 5 章')
    expect(prompt).toContain('近5章详记')
    expect(prompt).toContain('十章概要')
    expect(prompt).toContain('卷级总览')
    expect(prompt).toContain('压缩早期章节、保留近期细节')
    expect(prompt).toContain('不要通读全书或重算全量伏笔')
    expect(prompt).toContain('longform_checks')
    expect(prompt).toContain('longform_checks 每项必须包含 key, label, status, recent_5_chapter_progress, payoff_interval, stage_goal_shift, next_stage_pull, context_layer, evidence, fix, remaining_risk')
    expect(prompt).toContain('缺少最近5章进展、爽点间隔、阶段目标位移或下一阶段牵引证据时 status 不能写 pass/ok')
  })

  test('injects core contract evidence for contract repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'core_contract_gap',
      annotation_category: 'core_contract',
      message: '核心契约存在缺口。',
      action: '按 core_contract_checks 回修正文。',
      core_contract_check_sync: {
        label: '核心契约缺口 1',
        missed: [
          {
            label: '核心契约',
            text: '本章追逐支线宝物，主角没有服务规则反制的核心承诺，小情绪没有服从全书核心情绪，章尾也没有回到主线问题。',
            fix: '把支线宝物改成规则判定证据，让主角用规则反制兑现核心承诺，并把章尾问题压回全书核心情绪。',
          },
        ],
        next_actions: ['核心契约必须服务核心承诺、主题统一和章末主线问题。'],
      },
    })

    expect(prompt).toContain('【创作契约修复：核心承诺】')
    expect(prompt).toContain('核心契约缺口 1')
    expect(prompt).toContain('核心契约：本章追逐支线宝物')
    expect(prompt).toContain('核心承诺')
    expect(prompt).toContain('主题统一')
    expect(prompt).toContain('创作契约定位：修核心承诺不是把支线解释得更合理')
    expect(prompt).toContain('必须用正文证据证明主线服务、核心情绪、规则判定和章尾问题重新回到本书承诺')
    expect(prompt).toContain('core_contract_checks')
    expect(prompt).toContain('core_contract_checks 每项必须包含 key, label, status, core_promise, mainline_service, core_emotion, rule_judgement, ending_question, evidence, fix, remaining_risk')
    expect(prompt).toContain('缺少主线服务、核心情绪、规则判定或章尾问题回归证据时 status 不能写 pass/ok')
  })

  test('injects continuity heat evidence for heat-state repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'continuity_heat_gap',
      annotation_category: 'continuity_heat',
      message: '连续性热度存在缺口。',
      action: '按 continuity_heat_checks 回修正文。',
      continuity_heat_sync: {
        label: '连续性热度缺口 1',
        missed: [
          {
            label: '连续性热度',
            text: '旧印作为 hot 元素本章只提名字没有推进，盟友关系 warm 元素断温，cold 伏笔突然回收前没有升温。',
            fix: '让旧印触发新证据推进，补盟友站队或质疑保持关系热度，cold 回收前先给一处可见升温。',
          },
        ],
        next_actions: ['连续性热度必须推进 hot 元素、保温 warm 元素，cold 回收前必须升温。'],
      },
    })

    expect(prompt).toContain('【连续性热度修复】')
    expect(prompt).toContain('连续性热度缺口 1')
    expect(prompt).toContain('连续性热度：旧印作为 hot 元素')
    expect(prompt).toContain('hot 元素推进')
    expect(prompt).toContain('cold 回收前必须升温')
    expect(prompt).toContain('continuity_heat_checks')
    expect(prompt).toContain('continuity_heat_checks 每项必须包含 key, label, status, heat_state, hot_progress, warm_keepalive, cold_warmup, archived_boundary, evidence, fix, remaining_risk')
    expect(prompt).toContain('hot 未推进、warm 未保温、cold 回收前未升温或缺正文证据时 status 不能写 pass/ok')
  })

  test('injects revision receipt evidence for receipt repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'revision_receipt_gap',
      annotation_category: 'revision_receipt',
      message: '修订回执存在缺口。',
      action: '按 revision_receipt_checks 回修正文。',
      revision_receipt_check_sync: {
        label: '修订回执缺口 1',
        missed: [
          {
            label: '修订回执',
            text: 'delivery_risk_receipts 要求修正文首钩子，但 revision_receipts 没有给 changed_evidence。',
            fix: '重新输出 revision_receipts，逐条写清 required_action、repair_segment、applied_fix 和 changed_evidence。',
          },
        ],
        next_actions: ['修订回执必须逐条对应交付风险，并引用修订后正文证据。'],
      },
    })

    expect(prompt).toContain('【修订回执修复】')
    expect(prompt).toContain('修订回执缺口 1')
    expect(prompt).toContain('修订回执：delivery_risk_receipts 要求修正文首钩子')
    expect(prompt).toContain('revision_receipts')
    expect(prompt).toContain('changed_evidence')
    expect(prompt).toContain('revision_receipt_checks')
    expect(prompt).toContain('revision_receipt_checks 每项必须包含 key, label, status, required_action, repair_segment, applied_fix, changed_evidence, evidence, fix, remaining_risk')
    expect(prompt).toContain('revision_receipts 未逐条对应风险，或 changed_evidence 不能定位修订后正文时 status 不能写 pass/ok')
  })

  test('injects deslop repair evidence for de-ai repair receipt tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'deslop_repair_gap',
      annotation_category: 'deslop_repair',
      message: '去AI味修复存在缺口。',
      action: '按 deslop_repair_checks 回修正文。',
      deslop_repair_check_sync: {
        label: '去AI味修复缺口 1',
        missed: [
          {
            label: '去AI味修复',
            text: 'Gate E 模板化对白仍残留，但 deslop_repair_receipts 没有引用修订后正文证据。',
            fix: '重修 Gate E 对话腔调，并在 deslop_repair_receipts.changed_evidence 中引用修订后对白。',
          },
        ],
        next_actions: ['去AI味修复必须逐条对应 Gate A-G 残留，并引用修订后正文证据。'],
      },
    })

    expect(prompt).toContain('【去AI味修复】')
    expect(prompt).toContain('去AI味修复缺口 1')
    expect(prompt).toContain('去AI味修复：Gate E 模板化对白')
    expect(prompt).toContain('deslop_repair_receipts')
    expect(prompt).toContain('Gate A-G')
    expect(prompt).toContain('deslop_repair_checks')
    expect(prompt).toContain('deslop_repair_checks 每项必须包含 key, label, status, gate, original_risk, rewritten_evidence, changed_evidence, receipt_synced, fix, remaining_risk')
    expect(prompt).toContain('Gate A-G 残留未重写、changed_evidence 缺正文证据或回执未同步时 status 不能写 pass/ok')
  })

  test('injects prose meta evidence for immersion repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'prose_meta_gap',
      annotation_category: 'prose_meta',
      message: '正文元叙事存在缺口。',
      action: '按 prose_meta_checks 回修正文。',
      prose_meta_sync: {
        label: '正文元叙事缺口 1',
        missed: [
          {
            label: '正文元叙事',
            text: '正文出现“这一章主要用来铺垫后续反转”这类作者说明，破坏读者沉浸。',
            fix: '删除作者说明，把铺垫改成角色当场看到的证据、误判或行动后果。',
          },
        ],
        next_actions: ['正文必须删除作者说明、创作术语和元叙事提示，全部改成角色现场证据。'],
      },
    })

    expect(prompt).toContain('【正文元叙事修复】')
    expect(prompt).toContain('正文元叙事缺口 1')
    expect(prompt).toContain('正文元叙事：正文出现“这一章主要用来铺垫后续反转”')
    expect(prompt).toContain('作者说明')
    expect(prompt).toContain('角色现场证据')
    expect(prompt).toContain('标题行以外不得出现')
    expect(prompt).toContain('第[一二三四五六七八九十百千万两0-9]+章')
    expect(prompt).toContain('上一章/上章/前一章/本章/这一章/前文/后文/伏笔/细纲/读者')
    expect(prompt).toContain('改成角色当下能感知的事件锚点、相对时间、物件状态或对话信息')
    expect(prompt).toContain('故事世界内真实阅读/讨论“第X章”')
    expect(prompt).toContain('输出要求：必须返回 prose_meta_checks')
    expect(prompt).toContain('prose_meta_checks 每项必须包含 key, label, status, matched_term, location, replacement, evidence, remaining_risk')
    expect(prompt).toContain('标题行以外仍有工程词时 status 不能写 pass/ok')
    expect(prompt).toContain('prose_meta_checks')
  })

  test('injects banned words repair rules for post-draft cleanup tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'banned_words_gap',
      annotation_category: 'banned_words',
      message: '禁用词扫描命中一级词。',
      action: '按 banned_words_checks 回修正文。',
      banned_words_sync: {
        label: '禁用词命中 2',
        missed: [
          {
            label: '一级禁用词',
            text: '正文命中“眼中闪过一丝”和“只见”。',
            fix: '改成具体动作、事实、口语化对白或场景内判断。',
          },
        ],
        next_actions: ['对照 references/banned-words.md，一级词命中即替换，修订后复扫到 0。'],
      },
    })

    expect(prompt).toContain('【禁用词扫描修复】')
    expect(prompt).toContain('禁用词命中 2')
    expect(prompt).toContain('一级禁用词：正文命中“眼中闪过一丝”和“只见”')
    expect(prompt).toContain('references/banned-words.md')
    expect(prompt).toContain('一级词命中即替换')
    expect(prompt).toContain('具体动作、事实、口语化对白或场景内判断')
    expect(prompt).toContain('不得用同义套话替换')
    expect(prompt).toContain('输出要求：必须返回 banned_words_checks')
    expect(prompt).toContain('banned_words_checks 每项必须包含 key, label, status, matched_word, level, location, replacement, evidence, remaining_risk')
    expect(prompt).toContain('一级词或模板表达未复扫为 0 时 status 不能写 pass/ok')
    expect(prompt).toContain('banned_words_checks')
  })

  test('injects blueprint consumption repair rules for outline delivery gaps', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'blueprint_consumption_gap',
      annotation_category: 'blueprint_consumption',
      message: '细纲兑现存在缺口。',
      action: '按 blueprint_consumption_checks 回修正文。',
      blueprint_consumption_sync: {
        label: '细纲兑现缺口 3',
        blueprint_focus: {
          content_summary: '主角从被质疑到拿出反证。',
          plot_arrangement: '主线审判，辅线盟友改口。',
          character_order: '主角先入场，反派逼问，盟友最后改口。',
          plot_detail: '反证成功但暴露阵盘裂纹。',
          ending_hook: '裂纹引来内门势力注意。',
        },
        missed: [
          { label: '人物关系/出场顺序', text: '盟友改口没有按细纲出现在反证之后。' },
          { label: '代价兑现', text: '阵盘裂纹没有造成可见代价。' },
        ],
        next_actions: ['补爽点前危机/期待铺垫，补在场配角差异化反应，按目的词重排详略。'],
      },
    })

    expect(prompt).toContain('【细纲兑现修复】')
    expect(prompt).toContain('细纲兑现缺口 3')
    expect(prompt).toContain('内容概括：主角从被质疑到拿出反证')
    expect(prompt).toContain('情节安排：主线审判，辅线盟友改口')
    expect(prompt).toContain('人物关系/出场顺序：主角先入场，反派逼问，盟友最后改口')
    expect(prompt).toContain('情节细化：反证成功但暴露阵盘裂纹')
    expect(prompt).toContain('结尾设定和钩子：裂纹引来内门势力注意')
    expect(prompt).toContain('新版细纲存在时，必须消费内容概括五段式、情节安排多线、人物关系变化/出场顺序、代价兑现/收益兑现')
    expect(prompt).toContain('爽点出手前必须有可指认的危机/期待铺垫')
    expect(prompt).toContain('装逼/打脸/揭露章必须写出在场配角差异化反应')
    expect(prompt).toContain('详略必须按目的词')
    expect(prompt).toContain('输出要求：必须返回 blueprint_consumption_checks')
    expect(prompt).toContain('blueprint_consumption_checks 每项必须包含 key, label, status, blueprint_field, expected, delivered_evidence, missing_gap, fix, remaining_risk')
    expect(prompt).toContain('新版细纲关键项未被正文证据兑现时 status 不能写 pass/ok')
    expect(prompt).toContain('blueprint_consumption_checks')
  })

  test('injects foreshadowing delta repair rules for incremental clue tracking', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'foreshadowing_delta_gap',
      annotation_category: 'foreshadowing_delta',
      message: '伏笔增量没有写回追踪台账。',
      action: '按 foreshadowing_delta_checks 回修正文和追踪/伏笔.md。',
      foreshadowing_delta_sync: {
        label: '伏笔增量缺口 2',
        missed: [
          {
            label: '新增伏笔',
            text: '第10章新增带血腰牌伏笔，但追踪/伏笔.md 没有登记。',
            fix: '补登记伏笔名称、状态、首次出现章节和 source_excerpt。',
          },
          {
            label: '推进伏笔',
            text: '阵盘裂纹从异常推进为危险信号，但状态仍是未触发。',
          },
        ],
        next_actions: ['只确认本轮新增/推进/回收的伏笔增量，不做全书伏笔审计。'],
      },
    })

    expect(prompt).toContain('【伏笔增量修复】')
    expect(prompt).toContain('伏笔增量缺口 2')
    expect(prompt).toContain('新增伏笔：第10章新增带血腰牌伏笔')
    expect(prompt).toContain('追踪/伏笔.md')
    expect(prompt).toContain('新增/推进/回收')
    expect(prompt).toContain('source_excerpt')
    expect(prompt).toContain('输出要求：必须返回 foreshadowing_delta_checks')
    expect(prompt).toContain('foreshadowing_delta_checks 每项必须包含 key, label, status, clue_name, delta_type, current_status, chapter, source_excerpt, ledger_path, fix, remaining_risk')
    expect(prompt).toContain('source_excerpt 不能定位到修订后正文，或追踪/伏笔.md 未写回时 status 不能写 pass/ok')
    expect(prompt).toContain('不得在日更流程中通读所有 session 或扫描全部正文做全量伏笔审计')
    expect(prompt).toContain('/story-review')
    expect(prompt).toContain('foreshadowing_delta_checks')
  })

  test('injects deterministic cleanup repair rules for hard prose cleanup risks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'deterministic_cleanup_gap',
      annotation_category: 'deterministic_cleanup',
      message: '确定性清理仍有 2 项残留。',
      action: '按 deterministic_prose_cleanup 回修正文。',
      deterministic_cleanup_sync: {
        label: '确定性清理残留 2',
        deterministic_prose_cleanup: {
          risk_count: 2,
          categories: [
            { label: '长省略号', count: 1, evidence: '“他沉默了……”' },
            { label: '高危 AI 句式', count: 1, evidence: '不是没有可能，而是必须立刻去做。' },
          ],
        },
        missed: [
          { label: '长省略号', text: '正文仍有长省略号硬停顿。' },
          { label: '高危 AI 句式', text: '正文仍有先否定再肯定的模板句。' },
        ],
      },
    })

    expect(prompt).toContain('【确定性清理修复】')
    expect(prompt).toContain('确定性清理残留 2')
    expect(prompt).toContain('deterministic_prose_cleanup')
    expect(prompt).toContain('risk_count：2')
    expect(prompt).toContain('长省略号')
    expect(prompt).toContain('高危 AI 句式')
    expect(prompt).toContain('MangaForge 确定性清理阶段')
    expect(prompt).toContain('deterministic_prose_cleanup.risk_count 为 0')
    expect(prompt).toContain('不得只在回执里声称已处理')
    expect(prompt).toContain('输出要求：必须返回 deterministic_prose_cleanup')
    expect(prompt).toContain('deterministic_prose_cleanup 必须包含 status, risk_count, categories, evidence, required_actions')
    expect(prompt).toContain('risk_count 大于 0 时 status 不能写 ok/pass')
    expect(prompt).not.toContain('node scripts/normalize-punctuation.js')
    expect(prompt).not.toContain('node scripts/check-ai-patterns.js --check')
  })

  test('injects serial risk repair evidence for continuous production repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'serial_risk_repair_gap',
      annotation_category: 'serial_risk_repair',
      message: '连续风险修复存在缺口。',
      action: '按 serial_risk_repair_checks 回修正文。',
      serial_risk_repair_sync: {
        label: '连续风险修复缺口 1',
        missed: [
          {
            label: '连续风险修复',
            text: '安全批量标记场景承接风险，但修订稿没有补 scene_serial_risk_repair_receipt。',
            fix: '补齐连续生产风险修复回执，并把场景承接变化落到正文证据。',
          },
        ],
        next_actions: ['连续风险修复必须补回执，并让场景承接变化可定位。'],
      },
    })

    expect(prompt).toContain('【连续风险修复】')
    expect(prompt).toContain('连续风险修复缺口 1')
    expect(prompt).toContain('连续风险修复：安全批量标记场景承接风险')
    expect(prompt).toContain('scene_serial_risk_repair_receipt')
    expect(prompt).toContain('场景承接变化')
    expect(prompt).toContain('serial_risk_repair_checks')
    expect(prompt).toContain('serial_risk_repair_checks 每项必须包含 key, label, status, risk_type, repair_receipt, continuity_change, state_change, evidence, fix, remaining_risk')
    expect(prompt).toContain('缺少连续生产风险回执、场景承接变化、状态变化或正文证据时 status 不能写 pass/ok')
  })

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

  test('injects reader trial drop point evidence for trial repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'reader_trial_review',
      issue_type: 'reader_trial_drop_point',
      severity: 'high',
      chapter_no: 7,
      message: '第7章章末钩子弱，试读用户可能弃读。',
      action: '重做第7章章末未解决问题。',
      reader_trial_review: {
        score: 68,
        status: 'needs_repair',
        summary: '读者试读存在弃读点。',
        drop_points: ['第7章章末钩子弱，试读用户可能弃读。'],
        repair_actions: ['重做第7章章末未解决问题。'],
        personas: [{ label: '平台试读用户', verdict: '第七章钩子弱。' }],
        segments: [{ label: '试读十章', score: 68, verdict: '第4-10章需要补强。' }],
      },
    })

    expect(prompt).toContain('【读者试读修复】')
    expect(prompt).toContain('试读评分：68')
    expect(prompt).toContain('试读状态：needs_repair')
    expect(prompt).toContain('弃读点：第7章章末钩子弱，试读用户可能弃读。')
    expect(prompt).toContain('模拟读者：平台试读用户：第七章钩子弱。')
    expect(prompt).toContain('试读分段：试读十章 68分：第4-10章需要补强。')
    expect(prompt).toContain('修复动作：重做第7章章末未解决问题。')
    expect(prompt).toContain('只修当前章节')
    expect(prompt).toContain('章末钩子')
  })

  test('injects first30 retention recheck evidence for opening batch repairs', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      issue_type: 'first30_retention_recheck',
      task_type: 'review_planning',
      message: '前30章留存状态需要处理：需重新诊断。',
      action: '重新运行前30章留存诊断，确认本批修改后的开篇三章、试读十章和付费前蓄势。',
      action_key: 'run_first30_retention',
      first30_retention: {
        status: 'stale',
        score: 76,
        stale: true,
        summary: '需重新诊断：前30章内容已在报告后更新。旧报告显示第4-10章试读闭环偏弱。',
        risks: [
          { severity: 'high', segment: '4-10', issue: '试读闭环偏弱', action: '重新运行前30章诊断' },
        ],
        next_actions: ['重新运行前30章诊断，确认第8-10章修复后的追读曲线。'],
        risky_chapters: [
          { chapter_no: 8, title: '试炼前夜', score: 61, flags: ['章末钩子弱'], risk_level: 'high' },
        ],
      },
    })

    expect(prompt).toContain('【前30章留存复诊】')
    expect(prompt).toContain('留存状态：stale')
    expect(prompt).toContain('留存评分：76')
    expect(prompt).toContain('需重新诊断：前30章内容已在报告后更新')
    expect(prompt).toContain('风险：4-10：试读闭环偏弱 -> 重新运行前30章诊断')
    expect(prompt).toContain('高危章节：第8章《试炼前夜》 61分：章末钩子弱')
    expect(prompt).toContain('必须重新校准开篇三章、试读十章和付费前蓄势')
  })

  test('injects delivery risk evidence and category-specific repair rules for annotation tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'review_annotation_risk',
      issue_type: 'storyline_sync_risk',
      severity: 'high',
      source_label: '剧情线同步',
      annotation_key: 'storyline_sync:203:10:10:storyline_sync_risk:剧情线风险 2',
      message: '漏推 主线：进入内门视野；禁揭风险 幕后规则源',
      action: '对齐本章计划推进、埋线、回收和禁揭边界，避免临时加戏或提前揭底。',
      acceptance_criteria: ['补回进入内门视野', '不得提前揭示幕后规则源'],
      payload: {
        status: 'warn',
        planned: [{ name: '主线：进入内门视野', expected_state_change: '主角进入内门候选名单' }],
        missed: [{ name: '主线：进入内门视野', expected_state_change: '本章必须让内门长老注意到主角' }],
        unplanned: [{ name: '额外推进：外神低语', actual_state_change: '正文提前出现外神提示' }],
        forbidden_touched: [{ name: '幕后规则源', reason: '第30章前不得揭示规则源头' }],
      },
    })

    expect(prompt).toContain('【交稿风险证据】')
    expect(prompt).toContain('风险来源：剧情线同步')
    expect(prompt).toContain('严重级别：high')
    expect(prompt).toContain('批注键：storyline_sync:203:10:10:storyline_sync_risk:剧情线风险 2')
    expect(prompt).toContain('计划要求：主线：进入内门视野：主角进入内门候选名单')
    expect(prompt).toContain('漏推：主线：进入内门视野：本章必须让内门长老注意到主角')
    expect(prompt).toContain('额外推进：额外推进：外神低语：正文提前出现外神提示')
    expect(prompt).toContain('禁揭风险：幕后规则源：第30章前不得揭示规则源头')
    expect(prompt).toContain('【分类修订策略】')
    expect(prompt).toContain('补回计划内剧情线的可见推进')
    expect(prompt).toContain('删除或改写计划外推进')
    expect(prompt).toContain('禁揭内容只能改成误导、遮挡或延迟兑现')
    expect(prompt).toContain('不得改长期主线方向、不得新增未确认设定、不得提前揭示禁揭信息。')
  })

  test('normalizes delivery risk category aliases when issue type is missing', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'review_annotation_risk',
      annotation_category: 'delivery_core',
      severity: 'high',
      source_label: '核心偏移',
      message: '本章反制爽点覆盖了长期主线压力。',
      action: '把偏离核心的段落改回服务主线压力。',
      payload: {
        status: 'warn',
        drift_risks: ['主角长期欲望被临时爽点盖住。'],
      },
    })

    expect(prompt).toContain('问题类型：core_drift')
    expect(prompt).toContain('风险来源：核心偏移')
    expect(prompt).toContain('守住作品核心、读者承诺、本章目标和核心冲突')
    expect(prompt).toContain('不能用临时爽点覆盖长期矛盾')
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

  test('reads nested oh-story delivery risk receipts for segment-specific repair rules', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'review_annotation_risk',
      issue_type: 'delivery_risk_receipts',
      severity: 'high',
      source_label: '交稿风险回执',
      payload: {
        oh_story_delivery_receipts: {
          delivery_risk_receipts: [
            {
              risk_item: '章末翻页风险',
              required_action: '章末把带血腰牌变成新的未解问题。',
              segment: 'ending',
              delivered: false,
              evidence: '最后一段只写众人沉默。',
              remaining_risk: '最后300字没有形成追读钩子。',
            },
          ],
        },
      },
    })

    expect(prompt).toContain('【分段交稿风险回执修复】')
    expect(prompt).toContain('章末承接修复：章末把带血腰牌变成新的未解问题。')
    expect(prompt).toContain('必须修到最后300字')
    expect(prompt).toContain('不得把章末风险挪到开篇或中段')
  })

  test('injects story unit repair rules for unit delivery tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'review_annotation_risk',
      issue_type: 'story_unit_sync_risk',
      severity: 'high',
      source_label: '剧情单元兑现',
      annotation_category: 'story_unit',
      annotation_key: 'story_unit_sync:303:18:18:story_unit_sync_risk:单元漏写 1 · 单元抢跑 1',
      message: '本章漏写入口钩子并提前消费后段小高潮。',
      action: '补足当前剧情单元职责，删除或延迟抢跑内容。',
      acceptance_criteria: ['补足入口钩子', '不得提前公开打脸执事'],
      payload: {
        story_unit: { title: '试炼前夜剧情单元', current_chapter_role: '入口钩子' },
        planned: [{ label: '当前职责', text: '入口钩子' }],
        missed: [{ label: '入口钩子', text: '第7章以试炼倒计时开场。' }],
        rushed_ahead: [{ label: '后段小高潮', text: '第10章公开打脸执事。' }],
        forbidden_touched: [{ label: '禁抢跑', text: '不得提前解决内门招揽条件' }],
      },
    })

    expect(prompt).toContain('风险来源：剧情单元兑现')
    expect(prompt).toContain('计划要求：当前职责：入口钩子')
    expect(prompt).toContain('单元抢跑：后段小高潮：第10章公开打脸执事。')
    expect(prompt).toContain('禁抢跑：禁抢跑：不得提前解决内门招揽条件')
    expect(prompt).toContain('补足当前剧情单元职责')
    expect(prompt).toContain('暗示、误导、遮挡或延迟兑现')
  })

  test('injects volume beat repair rules for climax delivery tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'review_annotation_risk',
      issue_type: 'volume_beat_missed',
      severity: 'medium',
      source_label: '卷级爆点兑现',
      annotation_category: 'volume_beat',
      annotation_key: 'volume_beat_sync:303:18:18:volume_beat_missed:爆点漏兑现 2',
      message: '没有写出警钟反转和腰牌入场。',
      action: '补足本章卷级爆点、小高潮或关键反转。',
      acceptance_criteria: ['补足卷中转折', '不提前透支卷末爆点'],
      payload: {
        status: 'warn',
        missed: [
          { label: '卷中转折', text: '警钟第三响，带血腰牌递入王府' },
          { label: '读者回报', text: '谢怀安当众夺回主动权' },
        ],
      },
    })

    expect(prompt).toContain('风险来源：卷级爆点兑现')
    expect(prompt).toContain('漏推：卷中转折：警钟第三响，带血腰牌递入王府')
    expect(prompt).toContain('补足本章卷级爆点、小高潮、中高潮或卷末爆点')
    expect(prompt).toContain('爆点必须落成现场冲突、选择代价、反制结果、关系变化或章末升级')
    expect(prompt).toContain('不得提前消费后续卷末爆点')
  })

  test('injects signature scene repair rules for missed strong scene tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'review_annotation_risk',
      issue_type: 'signature_scene_missed',
      severity: 'medium',
      source_label: '强场面兑现',
      annotation_category: 'signature_scene',
      annotation_key: 'signature_scene_sync:303:18:18:signature_scene_missed:强场面漏写 2',
      message: '标志性场面和读者回报没有落地。',
      action: '补回开写任务书指定的标志性场面。',
      acceptance_criteria: ['补足玻璃门内外对峙', '不得只补氛围描写'],
      payload: {
        status: 'warn',
        missed: [
          { label: '标志性场面', text: '玻璃门内外黑影贴着判定边界移动' },
          { label: '读者回报', text: '超人蛮力被规则反噬后由张智反杀诱饵' },
        ],
      },
    })

    expect(prompt).toContain('风险来源：强场面兑现')
    expect(prompt).toContain('漏推：标志性场面：玻璃门内外黑影贴着判定边界移动')
    expect(prompt).toContain('补回开写任务书指定的标志性场面')
    expect(prompt).toContain('写成可视化动作、空间冲突、规则代价、公开反转或读者可讨论的选择')
    expect(prompt).toContain('不得只补气氛描写')
  })

  test('injects million word runway repair rules for runway delivery tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'review_annotation_risk',
      issue_type: 'runway_sync_risk',
      severity: 'medium',
      source_label: '百万字航线',
      annotation_category: 'runway',
      annotation_key: 'runway_sync:303:18:18:runway_sync_risk:航线风险 2',
      message: '读者为什么翻页未兑现；规则反制爽点未兑现。',
      action: '补齐百万字航线的本章四问、读者燃料和红线约束。',
      acceptance_criteria: ['补出门外学生死因钩子', '不得提前揭露规则之源'],
      payload: {
        status: 'warn',
        four_question_missed: [
          { label: '读者为什么翻页', text: '门外学生说出李超的死因' },
        ],
        reader_fuel_missed: [
          { text: '规则反制爽点' },
        ],
        redline_touched: [
          { text: '提前揭露规则之源' },
        ],
      },
    })

    expect(prompt).toContain('风险来源：百万字航线')
    expect(prompt).toContain('漏推：读者为什么翻页：门外学生说出李超的死因')
    expect(prompt).toContain('漏推：规则反制爽点')
    expect(prompt).toContain('禁揭风险：提前揭露规则之源')
    expect(prompt).toContain('补齐百万字航线的本章四问')
    expect(prompt).toContain('补足 readerFuel')
    expect(prompt).toContain('不得触碰 redLines')
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

  test('uses a targeted opening rewrite when previous chapter handoff is missed', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'review_annotation_risk',
      issue_type: 'reader_expectation_debt',
      severity: 'medium',
      source_label: '读者期待',
      annotation_category: 'reader_expectation',
      annotation_key: 'reader_expectation_sync:303:3:3:reader_expectation_debt:期待欠账 1',
      message: '上一章承接没有兑现：湿漉漉学生敲响玻璃门。',
      action: '补齐读者期待账本中的必兑现项。',
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
    })

    expect(prompt).toContain('【开篇承接修复】')
    expect(prompt).toContain('重写或补写本章前 300-500 字')
    expect(prompt).toContain('上一章最后一幕：湿漉漉学生敲响玻璃门')
    expect(prompt).toContain('开篇先写角色对上一章钩子、危机、欠账或未解问题的直接反应')
    expect(prompt).toContain('不得从泛环境描写、空泛醒来或无关解释重新开场')
  })

  test('uses a targeted opening rewrite for safe-batch chapter handoff repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'chapter_handoff_missed',
      severity: 'medium',
      message: '章节交接漏接 1 项，开篇没有接住上一章悬念。',
      action: '重修本章开篇300字和第一场景。',
      chapter_handoff_review: {
        status: 'warn',
        missed_count: 1,
        missed: [
          {
            key: 'opening_handoff',
            label: '上一章承接',
            text: '阵盘第二道裂纹必须在开篇造成可见压力。',
            match_scope: 'opening',
          },
        ],
      },
    })

    expect(prompt).toContain('【开篇承接修复】')
    expect(prompt).toContain('重写或补写本章前 300-500 字')
    expect(prompt).toContain('阵盘第二道裂纹必须在开篇造成可见压力')
    expect(prompt).toContain('不得把上一章钩子拖到中后段才提一句')
    expect(prompt).toContain('输出要求：必须返回 chapter_handoff_checks')
    expect(prompt).toContain('chapter_handoff_checks 每项必须包含 key, label, status, previous_handoff, opening_obligation, opening_evidence, location, continuity_action, remaining_risk')
    expect(prompt).toContain('前300-500字没有接住上一章钩子、危机、欠账或未解问题时 status 不能写 pass/ok')
    expect(prompt).toContain('chapter_handoff_checks')
    expect(prompt).toContain('previous_handoff、opening_obligations、must_deliver、keep_alive 和 overdue')
  })

  test('uses a targeted opening pull rewrite when opening hook score is weak', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'review_annotation_risk',
      issue_type: 'opening_pull_risk',
      severity: 'medium',
      source_label: '可读性/网感',
      annotation_category: 'readability',
      annotation_key: 'readability:203:10:10:opening_pull_risk:开篇吸引力弱 52',
      message: '开篇 300 字吸引力评分 52，需要更快给出异常、危险、欲望或反常信息。',
      action: '重写前300字，把钩子、危机、角色反应和信息增量压到开篇现场。',
      payload: {
        readability_score: 84,
        opening_hook_score: 52,
        scene_readability_score: 82,
        meme_sense: { intensity: '轻度', immersion_risks: [] },
      },
    })

    expect(prompt).toContain('【开篇吸引力修复】')
    expect(prompt).toContain('开篇评分：52')
    expect(prompt).toContain('前 300 字')
    expect(prompt).toContain('异常、危险、欲望或反常信息')
    expect(prompt).toContain('不得从泛环境描写或设定解释开场')
  })

  test('uses a targeted ending page-turn rewrite when ending hook score is weak', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'review_annotation_risk',
      issue_type: 'ending_page_turn_risk',
      severity: 'medium',
      source_label: '可读性/网感',
      annotation_category: 'readability',
      annotation_key: 'readability:203:10:10:ending_page_turn_risk:章末翻页弱 55',
      message: '最后 300 字翻页评分 55，需要把章末问题压成下一章非看不可。',
      action: '重写最后300字，把危险升级、选择压力、反转或未解答案压到最后一幕。',
      payload: {
        readability_score: 83,
        opening_hook_score: 82,
        ending_hook_score: 55,
        scene_readability_score: 80,
        meme_sense: { intensity: '轻度', immersion_risks: [] },
      },
    })

    expect(prompt).toContain('【章末翻页修复】')
    expect(prompt).toContain('章末评分：55')
    expect(prompt).toContain('最后 300 字')
    expect(prompt).toContain('下一章非看不可')
    expect(prompt).toContain('不得用总结、说明或情绪收束代替章末钩子')
  })

  test('uses a targeted scene progression rewrite when scene readability score is weak', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'review_annotation_risk',
      issue_type: 'scene_progression_risk',
      severity: 'medium',
      source_label: '可读性/网感',
      annotation_category: 'readability',
      annotation_key: 'readability:203:10:10:scene_progression_risk:场景推进弱 58',
      message: '场景推进评分 58，场景目标、阻碍、转折、回报不够清楚。',
      action: '补齐每个场景的目标、阻碍、转折、回报。',
      payload: {
        readability_score: 82,
        opening_hook_score: 82,
        ending_hook_score: 82,
        scene_readability_score: 58,
        payoff_density_score: 80,
      },
    })

    expect(prompt).toContain('【场景推进修复】')
    expect(prompt).toContain('场景评分：58')
    expect(prompt).toContain('目标、阻碍、转折、回报')
    expect(prompt).toContain('不得只补说明文字')
  })

  test('uses a targeted payoff density rewrite when payoff density score is weak', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'review_annotation_risk',
      issue_type: 'payoff_density_risk',
      severity: 'medium',
      source_label: '可读性/网感',
      annotation_category: 'readability',
      annotation_key: 'readability:203:10:10:payoff_density_risk:爽点密度弱 56',
      message: '爽点密度评分 56，每 800-1200 字的信息增量或回报不足。',
      action: '补齐信息推进、能力展示、危机反制、关系变化或小回收。',
      payload: {
        readability_score: 82,
        opening_hook_score: 82,
        ending_hook_score: 82,
        scene_readability_score: 82,
        payoff_density_score: 56,
      },
    })

    expect(prompt).toContain('【爽点密度修复】')
    expect(prompt).toContain('爽点密度评分：56')
    expect(prompt).toContain('800-1200 字')
    expect(prompt).toContain('信息推进、能力展示、危机反制、关系变化或小回收')
  })

  test('builds an automatic closure plan only when delivery risk revision clears after recheck', () => {
    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        annotation_key: 'reader_payoff_sync:202:9:9:reader_payoff_debt:回报欠账 1',
      },
      {
        quality_refresh: { ok: true, score: 82 },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.annotationKey).toBe('reader_payoff_sync:202:9:9:reader_payoff_debt:回报欠账 1')
    expect(cleared.note).toContain('自动复检通过')
    expect(cleared.note).toContain('风险已清零')

    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        annotation_key: 'storyline_sync:203:10:10:storyline_sync_risk:剧情线风险 2',
      },
      {
        quality_refresh: { ok: true, score: 80 },
        delivery_risk_convergence: { status: 'residual', residual_count: 2, label: '仍有残留 2' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('仍有残留 2')

    const failedQuality = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        annotation_key: 'readability_review:301:12:12:readability_or_meme_risk:可读性风险 1',
      },
      {
        quality_refresh: { ok: false, error: '模型未返回质检' },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(failedQuality.taskStatus).toBe('needs_review')
    expect(failedQuality.annotationStatus).toBe('')
    expect(failedQuality.note).toContain('自动复检未通过')
  })

  test('closes oh-story post batch quality repair only when all warning checks clear', () => {
    const task = {
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'post_batch_quality_warning',
      message: 'oh-story 批次交稿后质检仍有 2 项未闭环。',
      post_batch_quality_check: {
        status: 'warn',
        chapter_nos: [8, 9, 10],
        checks: [
          { key: 'prose_meta', label: '正文元信息', status: 'warn', warn_count: 1 },
          { key: 'foreshadowing_delta', label: '伏笔增量', status: 'warn', warn_count: 1 },
        ],
      },
    }

    const cleared = buildDeliveryRiskRevisionClosurePlan(task, {
      quality_refresh: { ok: true, score: 86 },
      post_batch_quality_check: {
        status: 'ok',
        checks: [
          { key: 'prose_meta', label: '正文元信息', status: 'ok', warn_count: 0 },
          { key: 'foreshadowing_delta', label: '伏笔增量', status: 'ok', warn_count: 0 },
        ],
      },
    })

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('')
    expect(cleared.annotationKey).toBe('')
    expect(cleared.note).toContain('post_batch_quality_check')
    expect(cleared.note).toContain('已清零')

    const residual = buildDeliveryRiskRevisionClosurePlan(task, {
      quality_refresh: { ok: true, score: 83 },
      post_batch_quality_check: {
        status: 'warn',
        checks: [
          { key: 'prose_meta', label: '正文元信息', status: 'warn', warn_count: 1, summaries: ['第9章仍残留作者说明'] },
          { key: 'foreshadowing_delta', label: '伏笔增量', status: 'ok', warn_count: 0 },
        ],
      },
    })

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('正文元信息')
    expect(residual.note).toContain('第9章仍残留作者说明')

    const missingChecks = buildDeliveryRiskRevisionClosurePlan(task, {
      quality_refresh: { ok: true, score: 87 },
      post_batch_quality_check: {
        status: 'ok',
      },
    })

    expect(missingChecks.taskStatus).toBe('needs_review')
    expect(missingChecks.note).toContain('post_batch_quality_check.checks 未返回')

    const failedQuality = buildDeliveryRiskRevisionClosurePlan(task, {
      quality_refresh: { ok: false, error: '模型未返回质检' },
      post_batch_quality_check: {
        status: 'ok',
        checks: [
          { key: 'prose_meta', label: '正文元信息', status: 'ok', warn_count: 0 },
          { key: 'foreshadowing_delta', label: '伏笔增量', status: 'ok', warn_count: 0 },
        ],
      },
    })

    expect(failedQuality.taskStatus).toBe('needs_review')
    expect(failedQuality.annotationStatus).toBe('')
    expect(failedQuality.note).toContain('自动复检未通过')
  })

  test('keeps unattended post-delivery repair tasks open until Step 3 recheck clears', () => {
    const task = {
      source: 'unattended_post_delivery_quality',
      issue_type: 'prose_meta_gap',
      annotation_category: 'prose_meta',
      chapter_no: 9,
      post_delivery_quality: {
        source: 'oh_story_step_3',
        status: 'warn',
        check: {
          key: 'prose_meta',
          label: '正文元信息',
          status: 'warn',
          summary: '第9章仍残留作者说明。',
          warn_count: 1,
        },
      },
    }

    const residual = buildDeliveryRiskRevisionClosurePlan(task, {
      quality_refresh: {
        ok: true,
        score: 88,
        review: {
          prose_meta_checks: [],
        },
      },
      post_delivery_quality: {
        status: 'warn',
        checks: [
          { key: 'prose_meta', label: '正文元信息', status: 'warn', warn_count: 1, summary: '第9章仍残留作者说明。' },
        ],
      },
    })

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('单章交付后质检仍未闭环')
    expect(residual.note).toContain('正文元信息')

    const otherStep3Residual = buildDeliveryRiskRevisionClosurePlan(task, {
      quality_refresh: {
        ok: true,
        score: 90,
        review: {
          prose_meta_checks: [],
        },
      },
      post_delivery_quality: {
        status: 'ok',
        checks: [
          { key: 'prose_meta', label: '正文元信息', status: 'ok', warn_count: 0, unknown_count: 0 },
          { key: 'chapter_hook', label: '章尾钩子', status: 'warn', warn_count: 1, summary: '章尾没有形成下一章选择或危险。' },
        ],
      },
    })

    expect(otherStep3Residual.taskStatus).toBe('needs_review')
    expect(otherStep3Residual.note).toContain('单章交付后质检仍未闭环')
    expect(otherStep3Residual.note).toContain('章尾钩子')

    const missingChecks = buildDeliveryRiskRevisionClosurePlan(task, {
      quality_refresh: {
        ok: true,
        score: 92,
        review: {
          prose_meta_checks: [],
        },
      },
      post_delivery_quality: {
        status: 'ok',
      },
    })

    expect(missingChecks.taskStatus).toBe('needs_review')
    expect(missingChecks.note).toContain('post_delivery_quality.checks 未返回')

    const cleared = buildDeliveryRiskRevisionClosurePlan(task, {
      quality_refresh: {
        ok: true,
        score: 91,
        review: {
          prose_meta_checks: [],
        },
      },
      post_delivery_quality: {
        status: 'ok',
        checks: [
          { key: 'prose_meta', label: '正文元信息', status: 'ok', warn_count: 0, unknown_count: 0 },
        ],
      },
    })

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('')
    expect(cleared.note).toContain('单章交付后质检复检通过')
    expect(cleared.note).toContain('post_delivery_quality')
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
  })

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
