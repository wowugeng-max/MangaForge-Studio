import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import {
  buildDeliveryRiskRevisionClosurePlan,
  buildRepairTaskRevisionPrompt,
  listQualityContractRequiredFields,
  listQualityContractRequiredFieldKeys,
} from './repairTaskRevisionPrompt'

describe('buildRepairTaskRevisionPrompt closure', () => {
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

})
