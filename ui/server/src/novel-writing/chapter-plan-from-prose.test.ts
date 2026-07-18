import { describe, expect, test } from 'bun:test'
import {
  collectPlanAlignmentPatchesAfterProseChange,
  collectProjectPlanAlignmentPatches,
  detectAuthorialEndingBreak,
  detectChapterPlanProseMismatch,
  rebuildChapterPlanFromAcceptedProse,
} from './chapter-plan-from-prose'

const CH12_PROSE = `
“咚、咚、咚。”

沉闷而缓慢的敲门声在404号房的防盗铁门上回荡，门外那个阴冷滑腻的声音再次飘了进来：“小江啊……我来借个火，盛碗汤……你在家对吧？”

“妈妈”那只长满尸斑的肥胖右手，已经死死扣在了厨房木门的把手上。她手里拿着空碗。

江哲拧开防盗门，一把拉开铁门，将邻居拽进客厅，踩碎其大腿，并指如刀刺入胸腔，拽出惨绿色规则核心丢进空碗，用秩序碎片炼化吸收。

【提示：您已‘喝’下邻居提供的‘汤’。】

邻居惊恐尖叫：厨房里的东西闻到血腥味了。厨房符纸燃起黑火，门内传来婴儿啼哭，爸爸和妹妹融化成黑液往门缝流去。

江哲站在客厅中央，看着那扇即将被撞碎的厨房木门，缓缓握紧了拳头。

厨房里关着的，到底是什么？为什么会引起秩序碎片如此强烈的共鸣？而失去了“家人”的身份掩护，他该如何面对这个即将破门而出的毁灭级怪物？
`

const CH12_STALE = {
  id: 72,
  chapter_no: 12,
  title: '餐桌上的“温馨”晚餐',
  chapter_goal: '“爸爸”被热汤淋头，瞬间暴怒，身体膨胀，指甲变长，试图撕碎江哲。江哲反手一记耳光。',
  chapter_summary: '“爸爸”被热汤淋头，瞬间暴怒，江哲反手一记耳光。',
  conflict: '“爸爸”的暴走与江哲物理耳光的正面交锋',
  ending_hook: '江哲敲了敲桌子：“现在，能好好说话了吗？”',
  chapter_text: CH12_PROSE,
  raw_payload: {
    must_advance: ['爸爸利爪暴走与耳光'],
    pre_draft_brief: {
      confirmed_at: '2026-07-16T03:08:56.426Z',
      chapter_goal: '“爸爸”被热汤淋头，瞬间暴怒，江哲反手一记耳光。',
      core_conflict: '爸爸暴走',
    },
  },
}

describe('chapter plan from accepted prose', () => {
  test('detects stale dining task-book against neighbor/kitchen prose', () => {
    const mismatch = detectChapterPlanProseMismatch(CH12_STALE)
    expect(mismatch.mismatched).toBe(true)
    expect(mismatch.plan_stale).toBe(true)
    expect(mismatch.authorial_ending_break?.key).toBe('authorial_ending_break')
  })

  test('rebuilds task-book fields from prose and invalidates old confirmation', () => {
    const result = rebuildChapterPlanFromAcceptedProse(CH12_STALE, { force: true, source: 'test' })
    expect(result.rebuilt).toBe(true)
    expect(result.chapter_patch.chapter_goal).toMatch(/本章兑现|邻居|厨房|规则|核心|借火|敲门/)
    expect(result.chapter_patch.chapter_goal).not.toMatch(/反手一记耳光|能好好说话|章末留下/)
    expect(result.chapter_patch.conflict).toMatch(/邻居|厨房|敲门|规则|核心|妈妈|空碗|餐桌/)
    expect(result.chapter_patch.ending_hook).toMatch(/厨房|门|符纸|哭|拳头|黑|邻居|章末落在|核心|金光|暴涨/)
    expect(result.chapter_patch.ending_hook).not.toMatch(/能好好说话/)
    // No raw dialogue / broken mid-sentence shards in rebuilt task book.
    expect(result.chapter_patch.chapter_goal).not.toMatch(/分析员|按照小区管理条例|间穿透|面上/)
    expect(result.chapter_patch.raw_payload.pre_draft_brief.confirmed_at).toBeNull()
    expect(result.chapter_patch.raw_payload.plan_aligned_to_prose).toBe(true)
    expect(result.chapter_patch.raw_payload.pre_draft_brief.chapter_goal).toBe(result.chapter_patch.chapter_goal)
  })

  test('collects current rebuild + following resync patches', () => {
    const ch13 = {
      id: 73,
      chapter_no: 13,
      chapter_goal: '爸爸继续暴走',
      chapter_summary: '耳光后续',
      conflict: '餐桌对决',
      chapter_text: '',
      raw_payload: {},
    }
    const bag = collectPlanAlignmentPatchesAfterProseChange([CH12_STALE, ch13], CH12_STALE, {
      force: true,
      source: 'test',
      followLimit: 1,
    })
    expect(bag.current.rebuilt).toBe(true)
    expect(bag.patches.some(item => item.kind === 'current_plan_from_prose')).toBe(true)
    expect(bag.patches.some(item => item.kind === 'following_progress_resync')).toBe(true)
    const next = bag.patches.find(item => item.kind === 'following_progress_resync')
    expect(String(next?.patch?.chapter_goal || '')).toMatch(/承接上一章|禁止回放|厨房|邻居|敲门|推进/)
  })

  test('detectAuthorialEndingBreak catches pure rhetorical chapter tails', () => {
    const hit = detectAuthorialEndingBreak(CH12_PROSE)
    expect(hit?.key).toBe('authorial_ending_break')
    expect(hit?.directive).toMatch(/设问|场面|钩子/)
  })
})

describe('project plan alignment catch-up', () => {
  test('rebuilds late chapter goals away from borrow-fire seed when prose is committee arc', () => {
    const chapters = [
      {
        id: 1,
        chapter_no: 13,
        chapter_goal: '十点邻居敲门借火。江哲主动开门迎敌。',
        conflict: '十点邻居敲门借火',
        chapter_text: '半死不活的邻居与巨婴被炼化。【提示：您已吞噬并炼化邻里借贷规则核心】王奶奶在门外借酱油。',
      },
      {
        id: 2,
        chapter_no: 15,
        chapter_goal: '十点邻居敲门借火。江哲主动开门迎敌。',
        conflict: '清场倒计时',
        chapter_text: '物业经理挥动合规执法棍，被江哲捏成粉碎。三个物业诡异被轰碎成虚无。电梯坠入未定义区域。',
      },
      {
        id: 3,
        chapter_no: 19,
        chapter_goal: '十点邻居敲门借火。赶在清场倒计时归零前拧开404门。',
        conflict: '物业合规清场倒计时；404门外敲门',
        ending_hook: '看看外面那个不知死活的敲门者',
        chapter_text: '顾主任递出1号楼通行证和诡币。江哲拿着通行证准备进入1号楼。会议室对峙结束。',
      },
      {
        id: 4,
        chapter_no: 20,
        chapter_goal: '物业合规清场倒计时；十点邻居敲门借火',
        conflict: '清场倒计时',
        chapter_text: '',
      },
    ]
    const bag = collectProjectPlanAlignmentPatches(chapters, {
      source: 'test_project_align',
      onlyFromChapterNo: 13,
    })
    expect(bag.patch_count).toBeGreaterThan(0)
    const ch19 = bag.patches.find(item => item.chapter_no === 19)
    expect(ch19).toBeTruthy()
    const goal = String(ch19?.patch?.chapter_goal || '')
    expect(goal).not.toMatch(/十点邻居敲门借火|主动开门迎敌|清场倒计时/)
    expect(goal + String(ch19?.patch?.conflict || '')).toMatch(/居委会|1号楼|通行证|对峙|电梯|推进|本章兑现/)
    expect(goal).not.toMatch(/分析员|按照小区管理条例|，。/)
    const ch20 = bag.patches.find(item => item.chapter_no === 20)
    if (ch20) {
      const g20 = String(ch20.patch?.chapter_goal || '') + String(ch20.patch?.conflict || '')
      expect(g20).not.toMatch(/十点邻居敲门借火/)
    }
  })
})
