import { describe, expect, test } from 'bun:test'
import {
  buildBoundedProsePrompt,
  buildOhStoryDirectorPromptBlock,
  buildProsePromptContextSnapshot,
  prosePromptJson,
} from './prose-prompt-context'
import { chapter10HandoffFixture } from './fixtures/chapter-10-11-handoff'

describe('prose prompt context helpers', () => {
  test('builds compact context snapshots with director budget omissions', () => {
    const snapshot = buildProsePromptContextSnapshot({
      chapter_target: {
        chapter_no: 5,
        title: '旧账开封',
        summary: '主角进入审判庭。',
        longform_structure_contract: { should_be_omitted: true },
        scene_cards: [
          {
            scene_no: 1,
            title: '封条破裂',
            required_beats: ['账册翻页'.repeat(100)],
            sensory_anchor: '纸灰落在掌心',
          },
        ],
      },
      oh_story_director: {
        stage: 'pre_draft',
        selected_contracts: [{ key: 'quality_audit_contract', detail_level: 'full', reason: '本章要交稿' }],
        prompt_budget_plan: {
          omit: ['longform_structure_contract'],
          full: ['quality_audit_contract'],
        },
      },
    })

    expect(snapshot.chapter_target.chapter_no).toBe(5)
    expect(snapshot.chapter_target.scene_cards[0].required_beats[0].length).toBeLessThanOrEqual(225)
    expect(snapshot.chapter_target.longform_structure_contract).toBeUndefined()
    expect(snapshot.oh_story_director.prompt_budget_plan.full).toEqual(['quality_audit_contract'])
  })

  test('removes diagnostic noise from compact scene-card repair fields', () => {
    const snapshot = buildProsePromptContextSnapshot({
      chapter_target: {
        chapter_no: 9,
        title: '会长私印',
        scene_cards: [
          {
            scene_no: 1,
            title: '会长室对峙',
            serial_risk_repairs: [
              '近章风险修复：把上一章封条复响改成当前阻碍；remaining_risk delivery_risk_receipts scene_cards.serial_risk_repairs 未闭环；只保留这条可写动作',
            ],
            risk_repairs: [
              '模型自检：prose_craft_checks missed next_actions；补主角主动逼问',
            ],
          },
        ],
      },
    })

    const serialized = prosePromptJson(snapshot, 6000)

    expect(serialized).toContain('会长室对峙')
    expect(serialized).toContain('只保留这条可写动作')
    expect(serialized).not.toContain('remaining_risk')
    expect(serialized).not.toContain('delivery_risk_receipts')
    expect(serialized).not.toContain('prose_craft_checks')
  })

  test('builds director prompt blocks and bounded prompts without dropping required tail', () => {
    const directorBlock = buildOhStoryDirectorPromptBlock({
      oh_story_director: {
        stage: 'draft',
        readiness: 'ready',
        primary_action: { key: 'write_prose', label: '写正文' },
        selected_contracts: [{ key: 'dialogue_contract', detail_level: 'full', reason: '对白驱动' }],
        suppressed_contracts: ['secondary_worldbuilding'],
        prompt_budget_plan: {
          full: ['dialogue_contract'],
          compact: ['state_tracking_contract'],
          reference: ['style_boundary_contract'],
          omit: ['longform_structure_contract'],
        },
      },
    })

    const bulkySections = Array.from({ length: 140 }, (_, index) => `【辅助资料${index + 1}】\n${'资料'.repeat(2000)}`)
    const bounded = buildBoundedProsePrompt([
      ...bulkySections,
      '【结构化上下文包】',
      prosePromptJson({ bulky: '资料'.repeat(200000) }, 200000),
      '【段落级写作要求】',
      '必须保留 scene_card_receipts 和 ending_hook。',
    ])

    expect(directorBlock).toContain('【oh-story 总导演】')
    expect(directorBlock).toContain('selected_contracts：dialogue_contract / detail=full / reason=对白驱动')
    expect(directorBlock).toContain('prompt_budget_plan：full=dialogue_contract')
    expect(bounded.length).toBeLessThanOrEqual(180000)
    expect(bounded).toContain('【上下文预算裁剪】')
    expect(bounded).toContain('【段落级写作要求】')
    expect(bounded).toContain('scene_card_receipts')
  })

  test('preserves the true last sentence of a long previous handoff and the first-scene transition', () => {
    const noisyLead = '前章过程信息。'.repeat(180)
    const snapshot = buildProsePromptContextSnapshot({
      chapter_target: {
        chapter_no: 11,
        previous_handoff: `${noisyLead}${chapter10HandoffFixture.lastSentenceSentinel}`,
        scene_cards: [{
          scene_no: 1,
          title: '地下岔口',
          transition_from_previous: '暗金绢册再次发热，沈砚先回应老陈的警告，再处理逼近的铁链声。',
          goal: '关上应急门。',
        }],
      },
    })

    const serialized = prosePromptJson(snapshot, 7000)
    expect(serialized).toContain(chapter10HandoffFixture.lastSentenceSentinel)
    expect(serialized).toContain('transition_from_previous')
    expect(serialized).toContain('暗金绢册再次发热')
  })

  test('keeps compact story-driving briefs while removing receipt and sync diagnostics', () => {
    const snapshot = buildProsePromptContextSnapshot({
      chapter_target: {
        recent_fatigue_brief: { next_actions: ['让失控列车逼苏禾当场选择'], diagnostics: 'DROP_DIAGNOSTIC' },
        write_preparation_brief: { rolling_rhythm_preflight: { principle: '列车进站前必须新增一次信息反转' } },
        delivery_risk_carry_over: { opening_actions: ['青铜罗盘倒转直接触发封站'], receipts: ['DROP_RECEIPT'] },
        conflict_structure_contract: { no_exit_rules: ['苏禾离站就会失去弟弟坐标'] },
        dialogue_contract: { key_lines: ['苏禾：下一班车根本不存在。'] },
        style_boundary_contract: { hard_constraints: ['短段推进，不写静态站景'] },
        prose_craft_checks_sync: { next_actions: ['DROP_SYNC'] },
      },
    })
    const serialized = prosePromptJson(snapshot, 10000)

    expect(serialized).toContain('让失控列车逼苏禾当场选择')
    expect(serialized).toContain('列车进站前必须新增一次信息反转')
    expect(serialized).toContain('青铜罗盘倒转直接触发封站')
    expect(serialized).toContain('苏禾离站就会失去弟弟坐标')
    expect(serialized).toContain('苏禾：下一班车根本不存在。')
    expect(serialized).toContain('短段推进，不写静态站景')
    expect(serialized).not.toContain('DROP_DIAGNOSTIC')
    expect(serialized).not.toContain('DROP_RECEIPT')
    expect(serialized).not.toContain('DROP_SYNC')
  })
})
