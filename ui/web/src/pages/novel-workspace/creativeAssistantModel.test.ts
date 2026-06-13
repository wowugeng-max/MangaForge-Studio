import { describe, expect, test } from 'bun:test'
import {
  CREATIVE_ASSISTANT_MODES,
  buildCreativeAssistantContextChips,
  buildCreativeAssistantFallbackCards,
  normalizeCreativeAssistPayload,
} from './creativeAssistantModel'

describe('creativeAssistantModel', () => {
  test('defines all author assistance modes', () => {
    expect(CREATIVE_ASSISTANT_MODES.map(mode => mode.key)).toEqual([
      'prose_review',
      'next_chapter',
      'outline_expand',
      'foreshadowing',
      'character_arc',
      'system_design',
      'research_cards',
    ])
    expect(CREATIVE_ASSISTANT_MODES.map(mode => mode.label)).toContain('正文评析')
    expect(CREATIVE_ASSISTANT_MODES.map(mode => mode.label)).toContain('联网资料')
  })

  test('builds fallback cards for every mode', () => {
    for (const mode of CREATIVE_ASSISTANT_MODES) {
      const cards = buildCreativeAssistantFallbackCards(mode.key, {
        project: {
          title: '规则夜航',
          reference_config: {
            writing_bible: {
              promise: '规则压力',
            },
          },
        },
        activeChapter: {
          chapter_no: 1,
          title: '第一夜',
          chapter_text: '门上的规则开始流血。',
          ending_hook: '第二条规则被撕掉。',
        },
        characters: [{ name: '林昼' }],
        outlines: [{ title: '前十章' }],
        reviews: [],
      })
      expect(cards.length).toBeGreaterThan(0)
      expect(cards[0].id).toContain(mode.key)
    }
  })

  test('builds context chips from workspace state', () => {
    const chips = buildCreativeAssistantContextChips({
      activeChapter: { id: 1 },
      selectedText: '一段正文',
      project: {
        reference_config: {
          writing_bible: { promise: '承诺' },
          references: [{ project_title: '样本' }],
        },
      },
      contextPackage: { ok: true },
      reviews: [{ review_type: 'prose_quality' }],
    })

    expect(chips.map(chip => chip.label)).toEqual(['当前章', '选中文本', '写作圣经', '上下文包', '质检', '参考'])
  })

  test('surfaces longform governance closure risks in context chips and fallback cards', () => {
    const runRecords = [
      {
        run_type: 'longform_production_repair',
        created_at: '2026-06-13T08:00:00Z',
        output_ref: JSON.stringify({
          audit_summary: {
            status: 'needs_followup',
            recovery_evidence_closure: {
              status: 'needs_followup',
              total: 1,
              resolved: 0,
              failed_evidence: ['主线焦点已明确'],
              watch_items: ['第45章仍需关注：quality_attention'],
            },
          },
        }),
      },
      {
        run_type: 'longform_production_repair',
        created_at: '2026-06-13T09:00:00Z',
        output_ref: JSON.stringify({
          source: 'storyline_diff_decision',
          tasks: [
            {
              source: 'storyline_diff_decision',
              issue_type: 'storyline_diff_revise_prose',
              task_status: 'needs_review',
              title: '第45章剧情线回修',
            },
          ],
        }),
      },
    ]

    const chips = buildCreativeAssistantContextChips({
      project: { reference_config: { writing_bible: { promise: '主线不偏' } } },
      runRecords,
    })
    const cards = buildCreativeAssistantFallbackCards('next_chapter', {
      project: { title: '万古长夜', reference_config: { writing_bible: { promise: '主线不偏' } } },
      runRecords,
    })

    expect(chips).toContainEqual(expect.objectContaining({
      key: 'longform_governance_closure',
      label: '治理闭环待处理',
      tone: 'warn',
    }))
    expect(cards[0].title).toContain('先处理长线治理闭环')
    expect(cards[0].suggestion).toContain('主线焦点已明确')
    expect(cards[0].suggestion).toContain('第45章剧情线回修')
    expect(cards[0].action).toBe('open_task_center')
  })

  test('carries closed governance recheck memory into creative assistant context', () => {
    const runRecords = [
      {
        run_type: 'longform_production_repair',
        created_at: '2026-06-13T22:00:00Z',
        output_ref: JSON.stringify({
          audit_summary: {
            status: 'closed',
            recovery_evidence_closure: {
              status: 'closed',
              total: 2,
              resolved: 2,
              repaired_evidence: ['第42章对白交锋已补回样章节奏', '章末读者回报已兑现'],
              watch_items: ['下一批继续观察样章策略命中率'],
            },
          },
        }),
      },
    ]

    const chips = buildCreativeAssistantContextChips({
      project: { reference_config: { writing_bible: { promise: '主线不偏' } } },
      runRecords,
    })
    const cards = buildCreativeAssistantFallbackCards('next_chapter', {
      project: { title: '万古长夜', reference_config: { writing_bible: { promise: '主线不偏' } } },
      runRecords,
    })

    expect(chips).toContainEqual(expect.objectContaining({
      key: 'longform_governance_memory',
      label: '治理复查已记录',
      tone: 'ready',
    }))
    expect(cards[0].title).toContain('沿用治理复查结果')
    expect(cards[0].suggestion).toContain('第42章对白交锋已补回样章节奏')
    expect(cards[0].suggestion).toContain('下一批继续观察样章策略命中率')
  })

  test('normalizes backend cards with stable ids', () => {
    const normalized = normalizeCreativeAssistPayload({
      mode: 'prose_review',
      summary: '可加强开篇',
      cards: [{ title: '加强规则压力', suggestion: '先写违规后果' }],
    })

    expect(normalized.cards[0].id).toBe('prose_review-card-1')
    expect(normalized.cards[0].action).toBe('copy')
  })
})
