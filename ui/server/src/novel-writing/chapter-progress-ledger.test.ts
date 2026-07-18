import { describe, expect, test } from 'bun:test'
import {
  applyProgressResyncToChapterPlan,
  buildNextChapterProgressResyncPatch,
  collectFollowingChapterProgressResyncPatches,
  detectPlanOverlap,
  enrichContextWithProgressResync,
  resolveChapterProgressLedger,
  splitPlanBeats,
} from './chapter-progress-ledger'

const CH11_PROSE = `
江哲端起汤碗，在“家人”期待而贪婪的目光中，突然将整碗汤倒在了“爸爸”的头上。
“爸爸”被热汤淋头，瞬间暴怒，身体膨胀，指甲变长，试图撕碎江哲。
江哲不闪不避，任由“爸爸”的利爪抓在自己脖子上，发出刺耳的金属摩擦声。
江哲反手一记耳光，将“爸爸”抽得在地上滚了三圈，牙齿掉了一地。
在这个家里，他不再是被猎杀的羔羊，而是真正的掌权者。
“现在，”江哲缓缓站起身，“开饭时间还没结束。妈妈，汤倒了，我很不开心。为了维持家庭的和睦，你是不是应该，再给我盛一碗？”
“妈妈”颤巍巍地拿起空碗，转身朝着厨房木门走去。
咚、咚、咚。三声沉闷的敲门声在防盗铁门上响了起来。
分针与时针正好在“12”和“10”的位置重合。晚上十点整。
门外的“邻居”，来借东西了。
而此时，“妈妈”正站在厨房门口，手里拿着空碗，僵硬地转过头，用那张没有五官的脸，死死地盯着江哲。
`

const CH11_SEED = {
  goal: '江哲降临在幸福里小区404号房，身份是“新搬来的长子”。他面前的茶几上放着一张《邻里相处守则》和一张《家庭公约》。坐在对面的“妈妈”、“爸爸”和“妹妹”脸色惨白，嘴角挂着诡异的微笑，催促他快点喝汤。规则一：必须维持家庭的和睦，不能拒绝家人的好意。',
  conflict: '江哲面临“家人”的规则逼迫，以及充满恶意的“毒汤”考验。',
  ending_hook: '江哲端起汤碗，在“家人”期待而贪婪的目光中，突然将整碗汤倒在了“爸爸”的头上。',
}

const CH12_SEED = {
  chapter_goal: '“爸爸”被热汤淋头，瞬间暴怒，身体膨胀，指甲变长，试图撕碎江哲。规则规定“不能对家人使用暴力”，否则会被剥夺身份。江哲不闪不避，任由“爸爸”的利爪抓在自己脖子上，发出刺耳的金属摩擦声。江哲反手一记耳光，将“爸爸”抽得在地上滚了三圈，牙齿掉了一地。',
  chapter_summary: '“爸爸”被热汤淋头，瞬间暴怒，身体膨胀，指甲变长，试图撕碎江哲。规则规定“不能对家人使用暴力”，否则会被剥夺身份。江哲不闪不避，任由“爸爸”的利爪抓在自己脖子上，发出刺耳的金属摩擦声。江哲反手一记耳光，将“爸爸”抽得在地上滚了三圈，牙齿掉了一地。',
  conflict: '“爸爸”的暴走与江哲物理耳光的正面交锋，规则惩罚的失效。',
  ending_hook: '“爸爸”捂着脸坐在地上，哭得像个两百斤的孩子。一旁的“妈妈”和“妹妹”瑟瑟发抖，江哲敲了敲桌子：“现在，能好好说话了吗？”',
  raw_payload: { must_advance: ['完成爸爸暴走对决'] },
}

describe('chapter progress ledger', () => {
  test('splits plan beats from Chinese outline text', () => {
    const beats = splitPlanBeats(CH12_SEED.chapter_goal)
    expect(beats.length).toBeGreaterThanOrEqual(2)
    expect(beats.join('｜')).toMatch(/热汤|利爪|耳光/)
  })

  test('ch11-like prose marks dining fight delivered and knock unresolved', () => {
    const ledger = resolveChapterProgressLedger({
      chapterText: CH11_PROSE,
      endingHook: CH11_SEED.ending_hook,
      plannedGoal: CH11_SEED.goal,
      plannedSummary: CH11_SEED.goal,
      plannedConflict: CH11_SEED.conflict,
      outgoingHandoff: {
        version: 'chapter_outgoing_handoff_v1',
        source: 'chapter_text_tail',
        unresolved_action: '门外的“邻居”，来借东西了。而此时，“妈妈”正站在厨房门口，手里拿着空碗。',
        anchors: ['邻居', '妈妈', '空碗'],
        ending_excerpt: CH11_PROSE.slice(-400),
        declared_hook: CH11_SEED.ending_hook,
        hook_tail_divergence: true,
        confidence: 90,
      },
    })

    expect(ledger.version).toBe('chapter_progress_ledger_v1')
    expect(ledger.delivered_beats.join('｜')).toMatch(/倒汤|耳光|掌权|利爪/)
    expect(ledger.forbidden_replays.length).toBeGreaterThan(0)
    expect(ledger.unresolved_next.join('｜') + ledger.overshot_into_future.join('｜')).toMatch(/敲门|邻居|十点|再盛|空碗/)
  })

  test('ch12 dad-fight seed becomes plan_stale against ch11 ledger', () => {
    const ledger = resolveChapterProgressLedger({
      chapterText: CH11_PROSE,
      endingHook: CH11_SEED.ending_hook,
      plannedGoal: CH11_SEED.goal,
      plannedConflict: CH11_SEED.conflict,
      outgoingHandoff: {
        version: 'chapter_outgoing_handoff_v1',
        source: 'chapter_text_tail',
        unresolved_action: '门外的“邻居”，来借东西了。',
        anchors: ['邻居'],
        ending_excerpt: '晚上十点整。门外的邻居来借东西了。',
        declared_hook: CH11_SEED.ending_hook,
        hook_tail_divergence: true,
        confidence: 90,
      },
    })

    const overlap = detectPlanOverlap(ledger, {
      goal: CH12_SEED.chapter_goal,
      summary: CH12_SEED.chapter_summary,
      conflict: CH12_SEED.conflict,
      ending_hook: CH12_SEED.ending_hook,
    }, { previousChapterText: CH11_PROSE })
    expect(overlap.plan_stale).toBe(true)
    expect(overlap.overlapping_beats.join('｜')).toMatch(/热汤|利爪|耳光|暴走/)

    const resync = applyProgressResyncToChapterPlan(CH12_SEED, ledger, { previousChapterNo: 11, previousChapterText: CH11_PROSE })
    expect(resync.resynced).toBe(true)
    expect(resync.plan_stale).toBe(true)
    expect(resync.chapter_goal).toMatch(/承接上一章|优先推进|禁止回放|邻居|敲门|借东西|再盛/)
    expect(resync.chapter_goal).not.toMatch(/任由“爸爸”的利爪抓在自己脖子上，发出刺耳的金属摩擦声/)
    expect(resync.forbidden_repeats.join('｜')).toMatch(/不要回放|耳光|利爪|倒汤|掌权/)
    expect(resync.must_advance.join('｜')).toMatch(/邻居|敲门|十点|空碗|再盛/)
    expect(resync.chapter_patch.raw_payload.progress_resync.plan_stale).toBe(true)
  })

  test('non-overshoot next plan stays unchanged', () => {
    const ledger = resolveChapterProgressLedger({
      chapterText: '江哲把档案合上，准备迎接新副本。白光闪过，他睁开眼。',
      endingHook: '白光闪过，他睁开眼。',
      plannedGoal: '休整结束，进入新副本。',
      plannedConflict: '新副本开启',
    })
    const next = {
      chapter_goal: '深夜十点，王奶奶敲门借酱油，江哲主动开门反制。',
      chapter_summary: '王奶奶诱杀与反向压制。',
      conflict: '邻里规则诱杀',
      ending_hook: '江哲把王奶奶拖进屋。',
      raw_payload: {},
    }
    const resync = applyProgressResyncToChapterPlan(next, ledger)
    expect(resync.resynced).toBe(false)
    expect(resync.chapter_patch).toEqual({})
  })

  test('enrichContextWithProgressResync rewrites stale chapter_target', () => {
    const context = enrichContextWithProgressResync({
      chapter_target: {
        goal: CH12_SEED.chapter_goal,
        summary: CH12_SEED.chapter_summary,
        conflict: CH12_SEED.conflict,
        ending_hook: CH12_SEED.ending_hook,
        must_advance: ['完成爸爸暴走对决'],
        forbidden_repeats: [],
      },
      continuity: {
        previous_chapter: {
          chapter_no: 11,
          chapter_text: CH11_PROSE,
          ending_hook: CH11_SEED.ending_hook,
          chapter_goal: CH11_SEED.goal,
          chapter_summary: CH11_SEED.goal,
          conflict: CH11_SEED.conflict,
          outgoing_handoff: {
            version: 'chapter_outgoing_handoff_v1',
            source: 'chapter_text_tail',
            unresolved_action: '门外的“邻居”，来借东西了。',
            anchors: ['邻居'],
            ending_excerpt: '晚上十点整。门外邻居来借东西了。',
            declared_hook: CH11_SEED.ending_hook,
            hook_tail_divergence: true,
            confidence: 90,
          },
        },
      },
    })

    expect(context.chapter_target.plan_stale).toBe(true)
    expect(context.chapter_target.goal).toMatch(/承接上一章|优先推进/)
    expect(context.chapter_target.forbidden_repeats.join('｜')).toMatch(/回放|耳光|利爪|倒汤/)
    expect(context.continuity.previous_chapter.chapter_progress_ledger.delivered_beats.length).toBeGreaterThan(0)
  })

  test('buildNextChapterProgressResyncPatch can update written chapter seeds without touching prose', () => {
    const previous = {
      chapter_no: 11,
      chapter_text: CH11_PROSE,
      ending_hook: CH11_SEED.ending_hook,
      chapter_goal: CH11_SEED.goal,
      conflict: CH11_SEED.conflict,
    }
    const skipped = buildNextChapterProgressResyncPatch({ ...CH12_SEED, chapter_text: '已有正文' }, previous)
    expect(skipped).toBeNull()
    const writtenSeed = buildNextChapterProgressResyncPatch(
      { ...CH12_SEED, chapter_text: '已有正文', id: 72, raw_payload: { pre_draft_brief: { confirmed_at: '2026-01-01', chapter_goal: CH12_SEED.chapter_goal } } },
      previous,
      { updateWrittenSeeds: true },
    )
    expect(writtenSeed?.chapter_goal).toMatch(/承接上一章|优先推进/)
    expect(writtenSeed).not.toHaveProperty('chapter_text')
    expect(writtenSeed?.raw_payload?.pre_draft_brief?.confirmed_at).toBeNull()
    expect(writtenSeed?.raw_payload?.pre_draft_brief?.plan_stale).toBe(true)
    const unwritten = buildNextChapterProgressResyncPatch({ ...CH12_SEED, chapter_text: '' }, previous)
    expect(unwritten?.chapter_goal).toMatch(/承接上一章|优先推进/)
  })

  test('enrichContextWithProgressResync rewrites stale scene cards and confirmed brief', () => {
    const context = enrichContextWithProgressResync({
      chapter_target: {
        goal: CH12_SEED.chapter_goal,
        summary: CH12_SEED.chapter_summary,
        conflict: CH12_SEED.conflict,
        ending_hook: CH12_SEED.ending_hook,
        must_advance: ['完成爸爸暴走对决'],
        forbidden_repeats: [],
        scene_cards: [
          { title: '利爪对决', purpose: '爸爸利爪抓喉，江哲耳光反杀' },
          { title: '收束', purpose: '逼问能不能好好说话' },
        ],
        chapter_blueprint: {
          opening_hook: '爸爸暴怒挥出利爪',
          core_payoff: '耳光打到能好好说话',
        },
      },
      pre_draft_brief: {
        confirmed_at: '2026-01-01',
        chapter_goal: CH12_SEED.chapter_goal,
        core_conflict: CH12_SEED.conflict,
        scene_briefs: [{ title: '利爪', purpose: '爸爸利爪与耳光' }],
      },
      continuity: {
        previous_chapter: {
          chapter_no: 11,
          chapter_text: CH11_PROSE,
          ending_hook: CH11_SEED.ending_hook,
          chapter_goal: CH11_SEED.goal,
          chapter_summary: CH11_SEED.goal,
          conflict: CH11_SEED.conflict,
          outgoing_handoff: {
            version: 'chapter_outgoing_handoff_v1',
            source: 'chapter_text_tail',
            unresolved_action: '门外的“邻居”，来借东西了。',
            anchors: ['邻居'],
            ending_excerpt: '晚上十点整。门外邻居来借东西了。',
            declared_hook: CH11_SEED.ending_hook,
            hook_tail_divergence: true,
            confidence: 90,
          },
        },
      },
    })
    expect(context.chapter_target.plan_stale).toBe(true)
    expect(context.chapter_target.scene_cards[0].purpose).toMatch(/承接|未解决|推进/)
    expect(context.chapter_target.scene_cards[0].purpose).not.toMatch(/利爪抓喉/)
    expect(context.pre_draft_brief.chapter_goal).toMatch(/承接上一章|优先推进/)
    expect(context.chapter_target.progress_resync_hard_rules.join('｜')).toMatch(/禁止回放|必须推进/)
  })

  test('collectFollowingChapterProgressResyncPatches updates written and unwritten followers', () => {
    const previous = {
      id: 71,
      chapter_no: 11,
      chapter_text: CH11_PROSE,
      ending_hook: CH11_SEED.ending_hook,
      chapter_goal: CH11_SEED.goal,
      conflict: CH11_SEED.conflict,
    }
    const patches = collectFollowingChapterProgressResyncPatches([
      previous,
      { id: 72, chapter_no: 12, ...CH12_SEED, chapter_text: '旧正文' },
      { id: 73, chapter_no: 13, chapter_goal: '深夜十点王奶奶敲门借酱油', chapter_summary: '敲门', conflict: '邻里诱杀', chapter_text: '' },
    ], previous, { limit: 2, updateWrittenSeeds: true })
    expect(patches.map(item => item.chapter_id)).toEqual([72, 73])
    expect(patches[0].patch.chapter_goal).toMatch(/承接上一章|优先推进|敲门|邻居/)
  })
})

describe('late-arc progress ledger handoff', () => {
  test('ch23-like interior landing suppresses elevator/pass residual unresolved hooks', () => {
    const prose = `
江哲单手拎起瘫软在地的阿奇姆。
物业制服干瘪尸体吊挂在半空。
血肉王座在门内大堂蠕动。
他带着阿奇姆，撞进1号楼青铜巨门后的未知黑暗。
`
    const ledger = resolveChapterProgressLedger({
      chapterText: prose,
      endingHook: '蛮横地撞进了那片未知的黑暗之中',
      plannedGoal: '',
      plannedConflict: '',
    })
    expect(ledger.unresolved_next.join('｜')).toMatch(/1号楼内部|血肉王座|同行天选|未知黑暗/)
    expect(ledger.unresolved_next.join('｜')).not.toMatch(/物业合规清场倒计时/)
    expect(ledger.unresolved_next.join('｜')).not.toMatch(/电梯\/未定义区域压力/)
  })

  test('resync replaces outline ending hook for unwritten next chapter', () => {
    const previousText = `
江哲带着阿奇姆冲向青铜巨门。
门内血肉王座蠕动，干瘪尸体吊挂。
整个人化作金色雷霆，蛮横地撞进了那片未知的黑暗之中。
`
    const ledger = resolveChapterProgressLedger({
      chapterText: previousText,
      endingHook: '蛮横地撞进了那片未知的黑暗之中',
    })
    const next = {
      id: 24,
      chapter_no: 24,
      chapter_goal: '电梯/未定义区域压力；1号楼通行证去向',
      conflict: '电梯压力',
      ending_hook: '大不列颠天选者悄悄激活了“替罪羊草偶”，一道红光射向江哲',
      chapter_text: '',
      raw_payload: {},
    }
    const resync = applyProgressResyncToChapterPlan(next, ledger, {
      previousChapterNo: 23,
      previousChapterText: previousText,
      force: true,
    })
    expect(resync.resynced).toBe(true)
    expect(String(resync.chapter_goal || '')).toMatch(/1号楼内部|血肉王座|同行天选|未知黑暗|承接/)
    expect(String(resync.chapter_goal || '')).not.toMatch(/替罪羊|电梯\/未定义区域压力；1号楼通行证去向/)
    expect(String(resync.chapter_patch?.ending_hook || '')).toMatch(/青铜|王座|黑暗|阿奇姆/)
    expect(String(resync.chapter_patch?.ending_hook || '')).not.toMatch(/替罪羊草偶/)
  })
})
