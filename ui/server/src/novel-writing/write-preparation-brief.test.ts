import { describe, expect, test } from 'bun:test'
import {
  buildCreationContractChecklist,
  buildWritePreparationBriefFromParts,
  normalizeWritePreparationBenchmarkRecallContext,
} from './write-preparation-brief'

describe('write preparation brief helpers', () => {
  test('returns empty preparation context when benchmark recall brief is absent', () => {
    expect(normalizeWritePreparationBenchmarkRecallContext(null)).toEqual({
      source_gaps: [],
      must_confirm: [],
      execution_order: [],
    })
  })

  test('turns benchmark recall gaps into write preparation gaps and confirmations', () => {
    const context = normalizeWritePreparationBenchmarkRecallContext({
      gaps: ['source_paths_missing', { matched_chapter: 'missing_summary' }],
      recallGaps: ['source_paths_missing'],
    })

    expect(context.source_gaps).toEqual([
      '文风召回：source_paths_missing',
      '文风召回：matched_chapter: missing_summary',
    ])
    expect(context.must_confirm).toContain('文风召回缺口：source_paths_missing')
    expect(context.must_confirm).toContain('文风召回缺口：matched_chapter: missing_summary')
    expect(context.execution_order).toEqual([])
  })

  test('adds secondary benchmark boundary confirmations and execution order', () => {
    const context = normalizeWritePreparationBenchmarkRecallContext({
      secondaryBenchmarkRecallSummary: [
        {
          bookTitle: '副书乙',
          usage: '参考情绪推进',
          relevance: '弱相关',
          citationStrength: '参考',
          registryOrder: 2,
        },
        {
          book_title: '副书甲',
          usage: '参考冲突结构',
          relevance: '同题材',
          citation_strength: '辅',
          registry_order: 1,
        },
      ],
      benchmarkRegistryMissing: true,
    })

    expect(context.source_gaps).toContain('文风召回：benchmark_registry_missing')
    expect(context.must_confirm).toContain('文风召回缺口：benchmark_registry_missing')
    expect(context.must_confirm.some(item => item.startsWith('副对标边界：副对标只用于结构/情绪/设定参考'))).toBe(true)
    expect(context.must_confirm).toContain('副对标召回摘要：副书甲、副书乙 只作为结构/情绪/设定参考。')
    expect(context.execution_order).toEqual([
      'Step 2.3 文风召回：先确认主对标最多 1 本，保留 secondary_benchmark_boundary；副对标召回摘要只进结构/情绪/设定，不进文风、不进原文锚点。',
    ])
  })

  test('builds creation contract checklist from contract aliases', () => {
    expect(buildCreationContractChecklist({
      targetReaderContract: {
        readerDesires: ['规则破解爽感'],
      },
      genre_positioning_contract: {
        selling_points: ['旧物修正规则'],
      },
      plotSpecialTopicsContract: {
        matchedTopics: ['规则怪谈维修'],
      },
      story_power_contract: {
        actionRules: ['主角必须用行动改变局面'],
      },
      coreContractRadar: {
        mustServe: ['旧钥匙必须服务破局承诺'],
      },
      readerRetentionBrief: {
        endingQuestion: '协会会长袖口印记是谁留下的？',
      },
    })).toEqual([
      '目标读者：规则破解爽感',
      '题材定位：旧物修正规则',
      '特殊题材：规则怪谈维修',
      '故事力：主角必须用行动改变局面',
      '核心承诺：旧钥匙必须服务破局承诺',
      '追读留存：协会会长袖口印记是谁留下的？',
    ])
  })

  test('builds write preparation brief from collected context parts', () => {
    const brief = buildWritePreparationBriefFromParts({
      state_source_rows: [
        { key: 'previous_chapter', label: '上一章承接', status: 'missing', evidence: '缺上一章尾声' },
        { key: 'chapter_blueprint', label: '本章蓝图', status: 'ready', evidence: '已确认' },
      ],
      benchmark_recall_preparation: {
        source_gaps: ['文风召回：source_paths_missing'],
        must_confirm: ['文风召回缺口：source_paths_missing'],
        execution_order: ['Step 2.3 文风召回：先锁主对标，再确认副对标边界。'],
      },
      asset_linkage_contract: {
        relationship_graph_risks: ['旧钥匙未挂钩禁门规则'],
      },
      delivery_risk_carry_over: {
        required_actions: ['补上旧钥匙的现场代价。'],
        opening_actions: ['前300字让主角检查钥匙齿纹。'],
        forbidden_repeats: ['不要只旁白解释钥匙来历。'],
      },
      chapter_blueprint: {
        opening_hook: '禁门锁孔反咬主角掌心。',
        core_payoff: '旧钥匙触发旧铺印记。',
        target_emotion: '压迫后的反证爽感',
        ending_contract: {
          next_chapter_pull: '协会会长袖口同款印记。',
        },
      },
      reader_retention_brief: {
        opening_hook: '用规则代价开场',
        reader_payoff: '旧钥匙规则破解爽点',
        must_deliver: ['章末留下协会会长疑点'],
      },
      rolling_rhythm_preflight: {
        principle: '拉期待速度 > 断期待速度',
        next_actions: ['提前铺设下一目标线索'],
        execution_order: ['滚动节奏：先补期待，再进入反证。'],
      },
      creation_contract_checklist: ['目标读者：规则破解读者', '核心承诺：旧物修正规则'],
    })

    expect(brief).toMatchObject({
      version: 'oh_story_write_preparation_v1',
      source: 'mangaforge_pre_draft_brief',
      readiness_status: 'needs_context',
      source_gaps: ['上一章承接｜状态=missing｜缺上一章尾声', '文风召回：source_paths_missing'],
      asset_risks: ['旧钥匙未挂钩禁门规则'],
    })
    expect(brief.delivery_risk_actions).toEqual([
      '补上旧钥匙的现场代价。',
      '开篇动作：前300字让主角检查钥匙齿纹。',
      '禁用重复：不要只旁白解释钥匙来历。',
    ])
    expect(brief.blueprint_focus).toEqual([
      '开篇钩子：禁门锁孔反咬主角掌心。',
      '核心回报：旧钥匙触发旧铺印记。',
      '目标情绪：压迫后的反证爽感',
      '章尾拉力：协会会长袖口同款印记。',
    ])
    expect(brief.reader_payoff_focus).toEqual([
      '用规则代价开场',
      '旧钥匙规则破解爽点',
      '章末留下协会会长疑点',
    ])
    expect(brief.must_confirm).toContain('创作契约：目标读者：规则破解读者')
    expect(brief.must_confirm).toContain('文风召回缺口：source_paths_missing')
    expect(brief.must_confirm).toContain('来源就绪：上一章承接｜状态=missing｜缺上一章尾声')
    expect(brief.must_confirm).toContain('关系图风险：旧钥匙未挂钩禁门规则')
    expect(brief.must_confirm).toContain('滚动节奏预检：拉期待速度 > 断期待速度')
    expect(brief.must_confirm).toContain('读者回报：旧钥匙规则破解爽点')
    expect(brief.execution_order.findIndex(item => item.includes('状态筛选'))).toBeLessThan(
      brief.execution_order.findIndex(item => item.includes('文风召回')),
    )
    expect(brief.execution_order).toContain('Step 2.3 文风召回：先锁主对标，再确认副对标边界。')
    expect(brief.execution_order).toContain('滚动节奏：先补期待，再进入反证。')
  })

  test('keeps execution risks advisory when all source evidence is ready', () => {
    const brief = buildWritePreparationBriefFromParts({
      state_source_rows: [
        { key: 'previous_chapter', label: '上一章承接', status: 'ready', evidence: '已读取第10章终稿' },
        { key: 'timeline_tracking', label: '追踪/时间线', status: 'ready', evidence: '时间、地点和事件顺序已确认' },
      ],
      benchmark_recall_preparation: {
        source_gaps: [],
        must_confirm: [],
        execution_order: [],
      },
      asset_linkage_contract: {
        relationship_graph_risks: ['旧钥匙需要在本章建立现场功能和代价'],
      },
      delivery_risk_carry_over: {
        opening_actions: ['前300字接住上一章围捕压力'],
        middle_actions: ['中段让旧钥匙参与规则反制'],
      },
      rolling_rhythm_preflight: {
        principle: '拉期待速度 > 断期待速度',
        next_actions: ['旧期待兑现前先铺下一层目标'],
        execution_order: ['滚动节奏：先铺下一目标，再兑现当前回报。'],
      },
    })

    expect(brief.source_gaps).toEqual([])
    expect(brief.readiness_status).toBe('ready')
    expect(brief.asset_risks).toEqual(['旧钥匙需要在本章建立现场功能和代价'])
    expect(brief.delivery_risk_actions).toContain('开篇动作：前300字接住上一章围捕压力')
    expect(brief.must_confirm).toContain('关系图风险：旧钥匙需要在本章建立现场功能和代价')
    expect(brief.execution_order).toContain('滚动节奏：先铺下一目标，再兑现当前回报。')
  })
})
