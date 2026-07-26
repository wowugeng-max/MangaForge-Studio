import { describe, expect, test } from 'bun:test'
import {
  buildTitleNameCanon,
  detectCharacterNameDrift,
  extractNamedCharacterMentions,
  planCharacterCardSync,
  buildCharacterIdentityCanon,
  detectCharacterIdentityDrift,
  extractCharacterIdentityMentions,
} from './character-card-sync'
import {
  mergeProseQualityWithDeliveryRisks,
  selectPriorityDeliveryDirectives,
} from './prose-quality-delivery-link'

const PREV_CHAPTERS = [
  {
    chapter_no: 1,
    chapter_text: '坐在首位的秦建国局长双眼布满了血丝。“局长，要使用提示吗？”',
  },
  {
    chapter_no: 2,
    chapter_text: '局长秦建国死死盯着屏幕，指关节发白。',
  },
  {
    chapter_no: 10,
    chapter_text: '一旁的特事局局长秦建国则挺直了腰杆。',
  },
  {
    chapter_no: 11,
    chapter_text: '特事局局长秦建国双手撑在控制台上。',
  },
]

const CH17_BAD = `
在大夏国最高战略分析局内，原本死寂的气氛在这一刻紧绷到了极点。
“局长！江哲进入了地下负二层会议室！”分析人员的声音都在颤抖。
赵国锋死死盯着屏幕，手心里全是冷汗。
`

describe('character card sync', () => {

  test('does not treat continuous action after office title as a person name', () => {
    const mentions = extractNamedCharacterMentions('距离物业经理按响门铃，还有四分五十秒。')
    expect(mentions.some(item => item.name === '按响门')).toBe(false)
    expect(mentions.some(item => item.name === '按响门铃')).toBe(false)
    expect(mentions.some(item => item.name === '距离')).toBe(false)
  })

  test('rejects common prose-slice junk names around office titles', () => {
    const samples = [
      '物业经理猛地挥手打断对讲。',
      '物业经理身上剥离出黑色纹路。',
      '物业经理那张扭曲的脸贴上门缝。',
      '局长要使用权限卡。',
      '局长瞳孔骤然收缩。',
      '业主委员会主任它所代表的规则开始生效。',
      '我们要局长出面说明。',
    ]
    const banned = ['猛地挥', '身上剥', '那张扭', '要使用', '瞳孔骤', '它所代', '我们要']
    for (const text of samples) {
      const mentions = extractNamedCharacterMentions(text)
      for (const name of banned) {
        expect(mentions.some(item => item.name === name)).toBe(false)
      }
    }
  })

  test('still extracts titled names with separators', () => {
    const mentions = extractNamedCharacterMentions('物业经理，王建国站在电梯口。')
    expect(mentions.some(item => item.name === '王建国' && item.title === '物业经理')).toBe(true)
  })

  test('extracts titled names across whitespace separators', () => {
    const spaced = extractNamedCharacterMentions('物业经理 王建国按响了门铃。')
    expect(spaced.some(item => item.name === '王建国' && item.title === '物业经理')).toBe(true)
    const newlined = extractNamedCharacterMentions('物业经理\n王建国站在门口。')
    expect(newlined.some(item => item.name === '王建国' && item.title === '物业经理')).toBe(true)
  })

  test('extracts title-bound names', () => {
    const mentions = extractNamedCharacterMentions(PREV_CHAPTERS[1].chapter_text)
    expect(mentions.some(item => item.name === '秦建国' && /局长/.test(String(item.title || '')))).toBe(true)
  })

  test('builds 局长=秦建国 canon from prior prose', () => {
    const canon = buildTitleNameCanon(PREV_CHAPTERS)
    expect(canon.some(item => item.name === '秦建国' && /局长/.test(item.title))).toBe(true)
  })

  test('detects ch17 赵国锋 drift against 秦建国 canon', () => {
    const drifts = detectCharacterNameDrift({
      chapterText: CH17_BAD,
      previousChapters: PREV_CHAPTERS,
    })
    expect(drifts.length).toBeGreaterThan(0)
    expect(drifts[0].canonical_name).toBe('秦建国')
    expect(drifts[0].drifted_name).toBe('赵国锋')
  })

  test('auto-creates missing named cast cards and skips drifted alias', () => {
    const plan = planCharacterCardSync({
      projectId: 3,
      chapter: {
        chapter_no: 17,
        project_id: 3,
        chapter_text: `
幸福里小区居委会主任顾主任坐在首位。
小林，樱花国仅存的天选者。
${CH17_BAD}
`,
      },
      existingCharacters: [{ id: 5, name: '江哲', role_type: '主角' }],
      previousChapters: PREV_CHAPTERS,
      characterUpdates: [
        { name: '顾主任', current_state: { location: '业主委员会' }, source_excerpt: '居委会主任顾主任' },
      ],
    })
    expect(plan.created_names).toContain('顾主任')
    // drifted 赵国锋 must not be created as a new official card
    expect(plan.created_names).not.toContain('赵国锋')
    expect(plan.name_drifts.some(item => item.drifted_name === '赵国锋')).toBe(true)
  })

  test('quality delivery link surfaces name drift and forces revision', () => {
    const selected = selectPriorityDeliveryDirectives({
      chapter: { id: 77, chapter_no: 17, chapter_text: CH17_BAD },
      previousChapters: PREV_CHAPTERS,
      limit: 5,
    })
    expect(selected.some(item => item.key === 'character_name_drift')).toBe(true)

    const linked = mergeProseQualityWithDeliveryRisks(
      { score: 96, passed: true, issues: [], revision_directives: [] },
      {
        chapter: { id: 77, chapter_no: 17, chapter_text: CH17_BAD },
        previousChapters: PREV_CHAPTERS,
      },
    )
    expect(linked.needs_revision).toBe(true)
    expect(linked.passed).toBe(false)
    expect(linked.score).toBeLessThanOrEqual(72)
    expect(linked.revision_directives.join('｜')).toMatch(/秦建国|赵国锋/)
  })
})

describe('pov residue guard', () => {
  const POV_CHAPTER_TEXT = [
    '林序发现了名单上的第三个名字。',
    '他确认纸条藏在鞋垫下面。',
    '赵国锋看到电梯门开了一条缝。',
    '物业经理赵国锋在楼下抽烟，没有上来。',
    '林序把名单折好塞进口袋。',
  ].join('\n')

  const basePlanInput = () => ({
    projectId: 1,
    chapter: { chapter_no: 12, project_id: 1, chapter_text: POV_CHAPTER_TEXT },
    existingCharacters: [
      { id: 7, name: '赵国锋', current_state: { title: '物业经理' } },
      { id: 1, name: '林序', current_state: {} },
    ],
    characterUpdates: [
      { name: '林序', current_state: { mood: '紧绷' } },
      { name: '赵国锋', current_state: { location: '楼下' } },
    ],
  })

  test('does not write pov residue into any card when chapter pov is unknown', () => {
    const plan = planCharacterCardSync(basePlanInput())
    for (const update of plan.character_updates) {
      const state = update.patch?.current_state || {}
      expect(state.pov_mode).toBeUndefined()
      expect(state.last_pov_character).toBeUndefined()
      expect(state.knowledge_now).toBeUndefined()
      expect(state.knowledge_ledger).toBeUndefined()
    }
  })

  test('attaches knowledge residue only to the chapter primary pov and filters other-cast lines', () => {
    const plan = planCharacterCardSync({
      ...basePlanInput(),
      contextPackage: { chapter_target: { primary_pov: '林序' } },
    })
    const lin = plan.character_updates.find(item => item.name === '林序')
    const zhao = plan.character_updates.find(item => item.name === '赵国锋')
    expect(lin?.patch?.current_state?.pov_mode).toBe('deep_limited')
    expect(lin?.patch?.current_state?.knowledge_now).toContain('林序发现了名单上的第三个名字。')
    // short line naming another cast member must not leak into the pov ledger
    expect(lin?.patch?.current_state?.knowledge_now).not.toContain('赵国锋看到电梯门开了一条缝。')
    expect(zhao?.patch?.current_state?.pov_mode).toBeUndefined()
    expect(zhao?.patch?.current_state?.knowledge_now).toBeUndefined()
    expect(zhao?.patch?.current_state?.knowledge_ledger).toBeUndefined()
  })

  test('skips pov write-back for the pov character when chapter leaves no knowledge or open questions', () => {
    const plan = planCharacterCardSync({
      projectId: 1,
      chapter: { chapter_no: 3, project_id: 1, chapter_text: '林序走过长廊。他把伞收好。' },
      existingCharacters: [{ id: 1, name: '林序', current_state: {} }],
      characterUpdates: [{ name: '林序', current_state: { mood: '平静' } }],
      povCharacters: ['林序'],
    })
    const lin = plan.character_updates.find(item => item.name === '林序')
    expect(lin?.patch?.current_state?.pov_mode).toBeUndefined()
    expect(lin?.patch?.current_state?.knowledge_ledger).toBeUndefined()
  })
})

describe('character identity canon', () => {
  test('extracts 樱花国天选者小林 from early chapters', () => {
    const mentions = extractCharacterIdentityMentions('【樱花国天选者：小林一郎。】\n小林，樱花国仅存的天选者。')
    expect(mentions.some(item => item.nationality === '樱花国' && /小林/.test(item.name))).toBe(true)
  })

  test('detects ch19 大夏国天选者小林 drift', () => {
    const previous = [
      { chapter_no: 10, chapter_text: '【樱花国天选者：小林一郎。】' },
      { chapter_no: 17, chapter_text: '小林，樱花国仅存的天选者。该死的大夏人……' },
    ]
    const drifts = detectCharacterIdentityDrift({
      chapterText: '【大夏国天选者小林，已死亡。】吞噬了同为天选者的小林后。',
      previousChapters: previous,
    })
    expect(drifts.length).toBeGreaterThan(0)
    expect(drifts[0].canonical_value).toBe('樱花国')
    expect(drifts[0].drifted_value).toBe('大夏国')
    expect(drifts[0].name).toMatch(/小林/)
  })

  test('identity canon prefers first established nationality', () => {
    const canon = buildCharacterIdentityCanon([
      { chapter_no: 10, chapter_text: '【樱花国天选者：小林一郎。】' },
      { chapter_no: 19, chapter_text: '【大夏国天选者小林，已死亡。】' },
    ])
    const xiao = canon.find(item => /小林/.test(item.name))
    expect(xiao?.nationality).toBe('樱花国')
  })

  test('plan auto-creates identity-bound 小林 card', () => {
    const plan = planCharacterCardSync({
      projectId: 3,
      chapter: {
        chapter_no: 17,
        chapter_text: '小林，樱花国仅存的天选者。他别着业主代表证。',
      },
      existingCharacters: [{ id: 5, name: '江哲', role_type: '主角' }],
      previousChapters: [
        { chapter_no: 10, chapter_text: '【樱花国天选者：小林一郎。】' },
      ],
    })
    expect(plan.created_names.some(name => /小林/.test(name)) || plan.identity_canon.some(item => /小林/.test(item.name))).toBe(true)
  })

  test('quality delivery link surfaces identity drift and forces revision', () => {
    const previous = [
      { chapter_no: 10, chapter_text: '【樱花国天选者：小林一郎。】' },
      { chapter_no: 17, chapter_text: '小林，樱花国仅存的天选者。' },
    ]
    const chapter = {
      id: 79,
      chapter_no: 19,
      chapter_text: '【大夏国天选者小林，已死亡。】',
    }
    const selected = selectPriorityDeliveryDirectives({
      chapter,
      previousChapters: previous,
      limit: 5,
    })
    expect(selected.some(item => item.key === 'character_identity_drift')).toBe(true)

    const linked = mergeProseQualityWithDeliveryRisks(
      { score: 92, passed: true, issues: [], revision_directives: [] },
      { chapter, previousChapters: previous },
    )
    expect(linked.needs_revision).toBe(true)
    expect(linked.revision_directives.join('｜')).toMatch(/樱花国|大夏国|小林/)
  })
})
