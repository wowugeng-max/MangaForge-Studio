import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import {
  buildDeliveryRiskRevisionClosurePlan,
  buildRepairTaskRevisionPrompt,
  listQualityContractRequiredFields,
  listQualityContractRequiredFieldKeys,
} from './repairTaskRevisionPrompt'

describe('buildRepairTaskRevisionPrompt contracts', () => {
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

})
