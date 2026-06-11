import { describe, expect, test } from 'bun:test'
import { buildDeliveryRiskRevisionClosurePlan, buildRepairTaskRevisionPrompt } from './repairTaskRevisionPrompt'

describe('buildRepairTaskRevisionPrompt', () => {
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
})
