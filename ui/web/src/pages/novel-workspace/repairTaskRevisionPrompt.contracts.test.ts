import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import {
  buildDeliveryRiskRevisionClosurePlan,
  buildRepairTaskRevisionPrompt,
  listQualityContractRequiredFields,
  listQualityContractRequiredFieldKeys,
} from './repairTaskRevisionPrompt'

describe('buildRepairTaskRevisionPrompt contracts', () => {
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

})
