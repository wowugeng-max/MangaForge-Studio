import { describe, expect, test } from 'bun:test'
import {
  buildLiveChapterContract,
  collectClosedBeatFamiliesFromChapters,
  detectClosedBeatsInChapter,
  detectZombiePressureInChapter,
  filterDeadGoalQualityReview,
  textDemandsClosedBeat,
} from './closed-beat-canon'
import { mergeProseQualityWithDeliveryRisks } from './prose-quality-delivery-link'
import { resolveChapterProgressLedger } from './chapter-progress-ledger'

const CH13_PROSE = `
江哲的神色平静异常。但在“家人”和那个半死不活的“邻居”眼里，这个微笑令人胆寒。
整面厨房隔墙坍塌，一个足有两米多高的诡异婴儿，被江哲拖到客厅。那是404号房真正的规则核心具现体。
金色的波纹将这只巨婴以及躺在地上、半死不活的“邻居”死死捆绑在一起。
金光化作巨大的物理磨盘。巨婴和残存的邻居被剥离概念基础，熔炼成一汪莹绿液体。
【提示：您已吞噬并炼化‘404号房深层规则核心’、‘邻里借贷规则核心’。】
“他把邻居和厨房里的毁灭级怪物……当成汤给喝了？！”
门外传来不一样的敲门声。
“小江啊……给王奶奶开开门好不好？”
`

const CH18_SEED_GOAL = '十点邻居敲门借火。江哲主动开门迎敌。反制邻居并炼化规则核心破局。章末留下：十点邻居敲门；地下负二层会议室。'

describe('closed-beat-canon', () => {
  test('ch13 prose closes neighbor_borrow_fire and kitchen core', () => {
    const closed = detectClosedBeatsInChapter({
      chapter_no: 13,
      chapter_text: CH13_PROSE,
    })
    const families = closed.map(item => item.family)
    expect(families).toContain('neighbor_borrow_fire')
    expect(families).toContain('kitchen_entity_core')
  })

  test('live contract strips dead borrow-fire goals for later chapter', () => {
    const previous = [
      { chapter_no: 13, chapter_text: CH13_PROSE, ending_hook: '王奶奶在门外借酱油' },
    ]
    const contract = buildLiveChapterContract({
      chapter: {
        chapter_no: 18,
        chapter_goal: CH18_SEED_GOAL,
        conflict: '十点邻居敲门借火；反制邻居并炼化规则核心破局',
        chapter_text: '江哲在地下负二层会议室硬抗抹杀规则，把小林扔向肉球主任。',
      },
      previousChapters: previous,
    })
    expect(contract.closed_blocked.length).toBeGreaterThan(0)
    expect(contract.closed_blocked.some(item => item.family === 'neighbor_borrow_fire')).toBe(true)
    expect(contract.acceptance_goals.join('｜')).not.toMatch(/主动开门迎敌/)
    expect(contract.live_goals.join('｜')).not.toMatch(/借火/)
    expect(contract.plan_health).toBe('dead_goal_pollution')
  })

  test('quality filter drops MISSING_GOAL that demands reopening closed neighbor', () => {
    const previous = [
      { chapter_no: 13, chapter_text: CH13_PROSE },
    ]
    const review = {
      score: 78,
      needs_revision: true,
      passed: false,
      issues: [
        {
          severity: 'high',
          type: 'target_missing',
          description: "未完成本章核心目标‘江哲主动开门迎敌’。正文仅写到地下负二层，并未回到404房开门迎敌。",
          fix: '返回404号房并主动开门迎战十点敲门借火邻居',
        },
        {
          severity: 'medium',
          type: 'filler_content',
          description: '弹幕段落过长',
          fix: '压缩弹幕',
        },
      ],
      revision_directives: [
        "补齐‘江哲主动开门迎敌’的情节，让江哲在章末主动拉开404房门，与门外‘十点敲门借火’的邻居正面撞上",
        '压缩分析局反应段落',
      ],
    }
    const filtered = filterDeadGoalQualityReview(review, {
      chapter: {
        chapter_no: 18,
        chapter_goal: CH18_SEED_GOAL,
        chapter_text: '江哲在地下负二层会议室。',
      },
      previousChapters: previous,
    })
    expect(filtered.dead_goal_filter.stripped_issue_count).toBeGreaterThan(0)
    expect(filtered.dead_goal_filter.stripped_directive_count).toBeGreaterThan(0)
    const proseIssues = filtered.issues.filter((item: any) => item?.type !== 'plan_error_dead_goal')
    expect(proseIssues.some((item: any) => /target_missing|MISSING_GOAL/i.test(String(item?.type || '')))).toBe(false)
    expect(proseIssues.map((item: any) => item.description).join('｜')).not.toMatch(/主动开门迎敌/)
    expect(filtered.revision_directives.join('｜')).not.toMatch(/借火|开门迎敌/)
    expect(filtered.revision_directives.join('｜')).toMatch(/压缩|弹幕|分析局/)
  })

  test('mergeProseQualityWithDeliveryRisks does not force revision solely for dead goals', () => {
    const previousChapter = {
      chapter_no: 17,
      title: '居委会的神秘会议',
      chapter_text: '江哲在地下负二层会议室与顾主任对峙，规则抹杀落下。章末压力仍在会议室。【提示：您已吞噬并炼化邻里借贷规则核心。】',
      ending_hook: '会议室对峙未结束，规则抹杀余波未散',
    }
    const chapter = {
      id: 78,
      chapter_no: 18,
      title: '规则借刀杀人',
      chapter_goal: CH18_SEED_GOAL,
      conflict: '十点邻居敲门借火；反制邻居并炼化规则核心破局',
      chapter_text: '江哲在地下负二层会议室硬抗规则抹杀，将小林扔向肉球主任。会议室对峙升级。',
      ending_hook: '会议室余波',
    }
    const linked = mergeProseQualityWithDeliveryRisks(
      {
        score: 78,
        needs_revision: true,
        passed: false,
        issues: [
          {
            severity: 'high',
            type: 'MISSING_GOAL',
            description: "未完成本章核心目标‘江哲主动开门迎敌’。",
            fix: '回到404主动开门迎敌',
          },
        ],
        revision_directives: ['返回404开门迎接借火邻居'],
      },
      {
        chapter,
        previousChapter,
        previousChapters: [
          { chapter_no: 13, chapter_text: CH13_PROSE },
          previousChapter,
        ],
        reviews: [],
        limit: 5,
      },
    )
    const proseIssues = (linked.issues || []).filter((item: any) => item?.type !== 'plan_error_dead_goal')
    expect(proseIssues.some((item: any) => /MISSING_GOAL|target_missing|主动开门迎敌/.test(JSON.stringify(item)))).toBe(false)
    expect(linked.dead_goal_filter?.stripped_issue_count || 0).toBeGreaterThan(0)
    expect(linked.revision_directives.join('｜')).not.toMatch(/借火|开门迎敌/)
    // dead goal alone must not keep needs_revision
    expect(linked.needs_revision).toBe(false)
  })

  test('progress ledger does not keep borrow-fire unresolved after refine', () => {
    const ledger = resolveChapterProgressLedger({
      chapterText: CH13_PROSE,
      endingHook: '王奶奶在门外礼貌敲门借酱油',
      plannedGoal: '十点邻居敲门借火。江哲主动开门迎敌。反制邻居并炼化规则核心破局。',
      plannedConflict: '十点邻居敲门借火；反制邻居并炼化规则核心破局',
    })
    expect(ledger.delivered_beats.join('｜') + ledger.forbidden_replays.join('｜')).toMatch(/借火邻居|邻里借贷|邻居/)
    expect(ledger.unresolved_next.join('｜')).not.toMatch(/主动开门迎敌/)
    // 王奶奶 may remain as forward pressure
    expect(ledger.unresolved_next.join('｜') + CH13_PROSE.slice(-80)).toMatch(/王奶奶|酱油|物业|未解|压力/)
  })

  test('collectClosedBeatFamiliesFromChapters is sticky across later chapters', () => {
    const closed = collectClosedBeatFamiliesFromChapters([
      { chapter_no: 13, chapter_text: CH13_PROSE },
      {
        chapter_no: 18,
        chapter_text: '江哲在居委会地下会议室。',
        chapter_goal: CH18_SEED_GOAL,
      },
    ])
    expect(closed.some(item => item.family === 'neighbor_borrow_fire' && item.status === 'closed')).toBe(true)
    expect(textDemandsClosedBeat('未完成本章核心目标江哲主动开门迎敌，去迎十点借火邻居', closed)).toBe(true)
  })
})

const CH15_PROPERTY_SMASH = `
“五分钟到了。我倒要看看，你们准备怎么‘合规清场’。”
物业经理挥动合规执法棍。江哲五指猛然发力，那根合规执法棍在物理握力下被生生捏成了粉碎。
“现在，我来教教你们什么叫真正的‘物理合规’。”
三个物业诡异连惨叫都来不及发出，便在这一拳的绝对力量下被生生轰碎成虚无。
`

const CH19_ZOMBIE_TAIL = `
肉球主任颤抖着递出1号楼通行证和一袋诡币。
而在江哲的超级感官中，地上404号房门外的敲门声变得更加疯狂、更加暴躁了。
既然拿到了合规的通行证，他现在就要赶在清场倒计时归零前，亲手拧开404号房的大门，看看外面那个不知死活的敲门者到底是个什么东西。
`

describe('closed-beat-canon zombie residuals', () => {
  test('property wave-1 smash closes property_compliance', () => {
    const closed = detectClosedBeatsInChapter({
      chapter_no: 15,
      chapter_text: CH15_PROPERTY_SMASH,
    })
    expect(closed.map(item => item.family)).toContain('property_compliance')
  })

  test('ch19-like ending is zombie residual after neighbor+property closed', () => {
    const closed = collectClosedBeatFamiliesFromChapters([
      { chapter_no: 13, chapter_text: CH13_PROSE },
      { chapter_no: 15, chapter_text: CH15_PROPERTY_SMASH },
    ])
    expect(closed.map(item => item.family)).toEqual(expect.arrayContaining([
      'neighbor_borrow_fire',
      'property_compliance',
    ]))
    const zombie = detectZombiePressureInChapter({
      chapter: {
        chapter_no: 19,
        chapter_text: CH19_ZOMBIE_TAIL,
        ending_hook: '亲手拧开404号房的大门，看看外面那个不知死活的敲门者',
      },
      closedBeats: closed,
    })
    expect(zombie.map(item => item.key).join('｜')).toMatch(/zombie_property_cleanup|zombie_door_knock/)
  })

  test('filterDeadGoalQualityReview forces revision directives for zombie prose', () => {
    const previous = [
      { chapter_no: 13, chapter_text: CH13_PROSE },
      { chapter_no: 15, chapter_text: CH15_PROPERTY_SMASH },
    ]
    const filtered = filterDeadGoalQualityReview(
      {
        score: 88,
        needs_revision: false,
        passed: true,
        issues: [],
        revision_directives: [],
      },
      {
        chapter: {
          chapter_no: 19,
          title: '反向勒索居委会',
          chapter_goal: '赶在清场倒计时归零前拧开404门看敲门者',
          ending_hook: '亲手拧开404号房的大门，看看外面那个不知死活的敲门者',
          chapter_text: CH19_ZOMBIE_TAIL,
        },
        previousChapters: previous,
      },
    )
    expect(filtered.needs_revision).toBe(true)
    expect(filtered.dead_goal_filter.zombie_findings.length).toBeGreaterThan(0)
    expect(filtered.revision_directives.join('｜')).toMatch(/清场|敲门|1号楼|禁止/)
    expect(filtered.issues.some((item: any) => item.type === 'zombie_pressure_replay')).toBe(true)
  })

  test('live contract strips zombie cleanup/knock seeds for later chapter', () => {
    const contract = buildLiveChapterContract({
      chapter: {
        chapter_no: 19,
        chapter_goal: '赶在清场倒计时归零前，亲手拧开404号房大门看敲门者',
        conflict: '物业合规清场倒计时；404门外敲门',
        ending_hook: '看看外面那个不知死活的敲门者',
        chapter_text: CH19_ZOMBIE_TAIL,
      },
      previousChapters: [
        { chapter_no: 13, chapter_text: CH13_PROSE },
        { chapter_no: 15, chapter_text: CH15_PROPERTY_SMASH },
      ],
    })
    expect(contract.plan_health).toBe('dead_goal_pollution')
    expect(contract.acceptance_goals.join('｜')).not.toMatch(/清场倒计时|敲门者|借火/)
    expect(contract.zombie_residuals.length + contract.closed_blocked.length).toBeGreaterThan(0)
  })
})
