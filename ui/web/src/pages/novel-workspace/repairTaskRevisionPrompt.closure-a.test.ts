import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import {
  buildDeliveryRiskRevisionClosurePlan,
  buildRepairTaskRevisionPrompt,
  listQualityContractRequiredFields,
  listQualityContractRequiredFieldKeys,
} from './repairTaskRevisionPrompt'

describe('buildRepairTaskRevisionPrompt closure a', () => {
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

})
