import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import {
  buildDeliveryRiskRevisionClosurePlan,
  buildRepairTaskRevisionPrompt,
  listQualityContractRequiredFields,
  listQualityContractRequiredFieldKeys,
} from './repairTaskRevisionPrompt'

describe('buildRepairTaskRevisionPrompt a', () => {
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
      readFileSync(new URL('./repair-task/prompt-lines-quality-core.ts', import.meta.url), 'utf8'),
      readFileSync(new URL('./repair-task/prompt-lines-quality-craft.ts', import.meta.url), 'utf8'),
      readFileSync(new URL('./repair-task/prompt-lines-quality-craft-a.ts', import.meta.url), 'utf8'),
      readFileSync(new URL('./repair-task/prompt-lines-quality-craft-b.ts', import.meta.url), 'utf8'),
      readFileSync(new URL('./repair-task/prompt-lines-quality-receipts.ts', import.meta.url), 'utf8'),
      readFileSync(new URL('./repair-task/prompt-lines-quality-repairs.ts', import.meta.url), 'utf8'),
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
      readFileSync(new URL('./repair-task/prompt-lines-quality-core.ts', import.meta.url), 'utf8'),
      readFileSync(new URL('./repair-task/prompt-lines-quality-craft.ts', import.meta.url), 'utf8'),
      readFileSync(new URL('./repair-task/prompt-lines-quality-craft-a.ts', import.meta.url), 'utf8'),
      readFileSync(new URL('./repair-task/prompt-lines-quality-craft-b.ts', import.meta.url), 'utf8'),
      readFileSync(new URL('./repair-task/prompt-lines-quality-receipts.ts', import.meta.url), 'utf8'),
      readFileSync(new URL('./repair-task/prompt-lines-quality-repairs.ts', import.meta.url), 'utf8'),
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

})
