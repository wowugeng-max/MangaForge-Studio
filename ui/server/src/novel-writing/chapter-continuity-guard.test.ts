import { describe, expect, test } from 'bun:test'
import {
  assessPrimaryOpeningHookContinuity,
  buildHardOpeningObligationsFromPrevious,
  collectContinuityGuardDirectives,
  decontaminateChapterSeedFields,
  detectDeliveredClimaxReplayDirective,
  detectGeneralProgressReplayDirective,
  detectOpeningHookMissDirective,
  extractDeliveredClimaxLandings,
  extractPrimaryEndingHooks,
  ensureOpeningHandoffBridge,
  freeTextEndingHookHit as rootFreeTextEndingHookHit,
} from './chapter-continuity-guard'
import { freeTextEndingHookHit as directivesFreeTextEndingHookHit } from './chapter-continuity-guard-directives'
import { freeTextEndingHookHit as leafFreeTextEndingHookHit } from './chapter-continuity-guard-free-text'
import {
  detectProgressReplayDirective,
  mergeProseQualityWithDeliveryRisks,
  selectPriorityDeliveryDirectives,
} from './prose-quality-delivery-link'

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

const CH12_PROSE_REPLAY = `
“爸爸”被热汤淋头，瞬间暴怒，身体膨胀，指甲变长，试图撕碎江哲。
江哲不闪不避，任由“爸爸”的利爪抓在自己脖子上，发出刺耳的金属摩擦声。
江哲反手一记耳光，将“爸爸”抽得在地上滚了三圈，牙齿掉了一地。
“现在，能好好说话了吗？”江哲敲了敲桌子。
`

const CH14_PROSE = `
王奶奶被江哲硬生生拽进了404，防盗铁门在身后关上了。
审讯开始。王奶奶在茶几前跪着，嘴里反复念着借酱油。
江哲把她拖到冰箱前，拉开冷冻室，将这具还在抽搐的躯壳塞了进去。
客厅的电视忽然自己亮了。
画面里，山本武藏举着八咫镜，面对“妈妈”递来的汤碗。
山本要求再盛汤，下一秒他的胸膛被洞穿，身体被撕成了碎片。
字幕闪过：挑战失败。
江哲没再看第二遍。他知道那只是平行死亡线的对照。
门铃响了。
物业送来一封厚信封，封皮写着“合规性清理通知·物理合规复核”。
“业主委员会决议：五分钟内完成物理合规自查，否则进入清场程序。”
倒计时数字在门禁屏上跳动：04:59。
江哲捏着信封，听见楼道里有脚步声逼近。
`

const CH15_PROSE_TV_REPLAY = `
电视画面里，山本武藏再次举着八咫镜。
他要求再盛汤，胸膛被洞穿，身体被撕成了碎片。
挑战失败。
江哲看着屏幕，才想起自己该出门。
他走进电梯，电梯门合上时，一张无脸贴在玻璃上。
数字跳到负一，又跳到未定义区域。
`

const CH15_PROSE_CONNECTED = `
江哲捏着物业信封，倒计时只剩四分。
他推开防盗铁门，楼道灯一盏盏灭掉。
电梯门开了，无脸贴在玻璃上，数字跳向负一。
`

const CH15_SEED_POLLUTED = {
  chapter_no: 15,
  chapter_goal: '十点邻居敲门借火；妈妈空碗/厨房规则压迫；江哲主动开门迎敌；反制邻居并炼化规则核心破局',
  chapter_summary: '继续处理邻居借火与厨房空碗双死局',
  conflict: '十点邻居敲门借火与爸爸利爪对决',
  chapter_text: CH15_PROSE_TV_REPLAY,
}

describe('chapter continuity guard', () => {
  test('keeps the free-text ending hook export identical across continuity guard surfaces', () => {
    expect(rootFreeTextEndingHookHit).toBe(directivesFreeTextEndingHookHit)
    expect(directivesFreeTextEndingHookHit).toBe(leafFreeTextEndingHookHit)
  })

  test('extracts property ending hook over mid-chapter TV parallel from ch14-like prose', () => {
    const hooks = extractPrimaryEndingHooks({
      chapter_text: CH14_PROSE,
      ending_hook: '物业信封与五分钟物理合规倒计时',
    })
    expect(hooks.some(item => item.key === 'property_enforcement')).toBe(true)
    expect(hooks[0]?.key).toBe('property_enforcement')
    const obligations = buildHardOpeningObligationsFromPrevious({
      chapter_text: CH14_PROSE,
      ending_hook: '物业信封与五分钟物理合规倒计时',
    })
    expect(obligations.join('｜')).toMatch(/物业|物理合规|禁止先重播/)
  })

  test('detects opening hook miss when ch15 opens on TV parallel instead of property', () => {
    const miss = detectOpeningHookMissDirective({
      previousChapter: {
        chapter_text: CH14_PROSE,
        ending_hook: '物业信封与五分钟物理合规倒计时',
      },
      chapter: { chapter_text: CH15_PROSE_TV_REPLAY },
    })
    expect(miss).toMatchObject({
      key: 'opening_hook_miss',
      severity: 'high',
    })
    expect(miss?.label).toMatch(/物业|开篇未接/)
    expect(miss?.directive).toMatch(/物业|物理合规|禁止先重播/)
  })

  test('detects TV parallel progress replay for ch14->ch15 style open', () => {
    const replay = detectGeneralProgressReplayDirective({
      previousChapter: {
        chapter_text: CH14_PROSE,
        ending_hook: '物业信封与五分钟物理合规倒计时',
      },
      chapter: {
        chapter_text: CH15_PROSE_TV_REPLAY,
        chapter_goal: '继续看清山本死亡线',
      },
    })
    expect(replay).toMatchObject({
      key: 'progress_replay',
      severity: 'high',
      label: '平行戏回放',
    })
    expect(replay?.directive).toMatch(/禁止|电视平行|物业/)
  })

  test('still detects dining fight replay for ch11->ch12', () => {
    const replay = detectGeneralProgressReplayDirective({
      previousChapter: { chapter_text: CH11_PROSE },
      chapter: {
        chapter_text: CH12_PROSE_REPLAY,
        chapter_goal: '“爸爸”被热汤淋头，利爪与耳光正面对决',
      },
    })
    expect(replay).toMatchObject({
      key: 'progress_replay',
      severity: 'high',
    })
    expect(replay?.directive).toMatch(/禁止回放|餐桌|敲门|邻居/)
  })

  test('collects both opening miss and progress replay for polluted ch15', () => {
    const directives = collectContinuityGuardDirectives({
      previousChapter: {
        chapter_text: CH14_PROSE,
        ending_hook: '物业信封与五分钟物理合规倒计时',
      },
      chapter: CH15_SEED_POLLUTED,
    })
    const keys = directives.map(item => item.key)
    expect(keys).toContain('progress_replay')
    expect(keys).toContain('opening_hook_miss')
    expect(directives.every(item => item.severity === 'high')).toBe(true)
  })

  test('decontaminates recycled early-chapter seed chains against property ending', () => {
    const cleaned = decontaminateChapterSeedFields({
      ...CH15_SEED_POLLUTED,
      previousChapter: {
        chapter_text: CH14_PROSE,
        ending_hook: '物业信封与五分钟物理合规倒计时',
      },
    })
    expect(cleaned.decontaminated).toBe(true)
    expect(cleaned.chapter_goal).not.toMatch(/十点邻居敲门借火/)
    expect(cleaned.chapter_goal).toMatch(/物业|物理合规|承接上一章/)
    expect(cleaned.must_advance.join('｜')).toMatch(/物业/)
  })

  test('hard-fails initial prose admission when primary property hook is missed', () => {
    const fail = assessPrimaryOpeningHookContinuity({
      chapterText: CH15_PROSE_TV_REPLAY,
      previousChapter: {
        chapter_text: CH14_PROSE,
        ending_hook: '物业信封与五分钟物理合规倒计时',
      },
    })
    expect(fail).toMatchObject({
      required: true,
      passed: false,
    })
    expect(fail.failure?.code).toBe('opening_primary_hook_miss')

    const pass = assessPrimaryOpeningHookContinuity({
      chapterText: CH15_PROSE_CONNECTED,
      previousChapter: {
        chapter_text: CH14_PROSE,
        ending_hook: '物业信封与五分钟物理合规倒计时',
      },
    })
    expect(pass).toMatchObject({
      passed: true,
    })
  })

  test('delivery link surfaces continuity directives for ch15-like QA', () => {
    const selected = selectPriorityDeliveryDirectives({
      reviews: [],
      previousChapter: {
        chapter_text: CH14_PROSE,
        ending_hook: '物业信封与五分钟物理合规倒计时',
      },
      chapter: CH15_SEED_POLLUTED,
      limit: 5,
    })
    expect(selected.some(item => item.key === 'progress_replay')).toBe(true)
    expect(selected.some(item => item.key === 'opening_hook_miss')).toBe(true)

    const linked = mergeProseQualityWithDeliveryRisks(
      { score: 88, passed: true, issues: [], revision_directives: [] },
      {
        reviews: [],
        previousChapter: {
          chapter_text: CH14_PROSE,
          ending_hook: '物业信封与五分钟物理合规倒计时',
        },
        chapter: CH15_SEED_POLLUTED,
      },
    )
    expect(linked.needs_revision).toBe(true)
    expect(linked.passed).toBe(false)
    expect(linked.score).toBeLessThanOrEqual(72)
    expect(linked.revision_directives.join('｜')).toMatch(/物业|平行|禁止/)
  })

  test('detectProgressReplayDirective delegates to general continuity guard', () => {
    const hit = detectProgressReplayDirective({
      previousChapter: {
        chapter_text: CH14_PROSE,
        ending_hook: '物业信封与五分钟物理合规倒计时',
      },
      chapter: {
        chapter_text: CH15_PROSE_TV_REPLAY,
      },
    })
    expect(hit?.label).toMatch(/平行戏回放|进度回放/)
  })
})


const CH23_PROSE_INTERIOR = `
江哲单手拎起瘫软在地的阿奇姆，深邃的目光穿透了重重血色迷雾，直直地锁定了1号楼那扇正在缓缓闭合、被无数蠕动血肉死死缠绕的青铜巨门。
那道由居委会设下的血色屏障，正散发着毁灭性的高维波动。
“抓稳了。”
江哲淡淡吐出三个字。下一刻，他体内的“秩序”与“混乱”双重权柄碎片微微共鸣。
在青铜巨门彻底咬合、只剩最后一丝缝隙的刹那，江哲的超级视力已然穿透了门后的黑暗——在那幽深的门内大堂里，无数具身穿物业制服的干瘪尸体正被吊挂在半空，而一具由纯粹血肉筑成的巨大王座，正在黑暗深处缓缓蠕动。江哲嘴角的冷笑一闪而逝，带着阿奇姆，整个人化作一道暴烈的金色雷霆，蛮横地撞进了那片未知的黑暗之中。
`

describe('late-arc primary ending hooks', () => {
  test('stale 1号楼 ending_hook cannot override true-tail 2号楼 seeker climax', () => {
    const prose = `
江哲嘴角勾起冰冷弧度。双重权柄碎片共鸣。

【3……2……1……】
【游戏开始。】
【“寻找者”已降临。】

通往2号楼的走廊血雾翻滚。大堂里的血肉王座都停止蠕动，缩成干瘪球体。

一个庞大身影走出血雾——红衣级怪谈，2号楼保安队长！它拖着巨型消防斧，脸中央是一只巨大猩红眼球。

“找到……你们了……”

抹杀规则轰然降临！
`
    const hooks = extractPrimaryEndingHooks({
      chapter_text: prose,
      ending_hook: '章末落在：1号楼内部/血肉王座',
    })
    expect(hooks[0]?.key).toBe('building_two_seeker')
    expect(hooks[0]?.label).toMatch(/2号楼|寻找者/)
  })

  test('ch23-like bronze-door ending is building interior, not residual property cleanup', () => {
    const hooks = extractPrimaryEndingHooks({
      chapter_text: CH23_PROSE_INTERIOR,
      ending_hook: '蛮横地撞进了那片未知的黑暗之中',
    })
    expect(hooks[0]?.key).toBe('building_one_interior')
    expect(hooks.map(item => item.key)).not.toContain('property_enforcement')
    expect(hooks[0]?.label).toMatch(/1号楼内部|突入/)
    const obligations = buildHardOpeningObligationsFromPrevious({
      chapter_text: CH23_PROSE_INTERIOR,
      ending_hook: '蛮横地撞进了那片未知的黑暗之中',
    })
    expect(obligations.join('｜')).toMatch(/1号楼内部|青铜|王座|突入/)
    expect(obligations.join('｜')).not.toMatch(/物业合规清场/)
  })
})

describe('delivered climax landing replay', () => {
  test('detects ch24-like re-entry after ch23 already crashed into building interior', () => {
    const previous = {
      chapter_no: 23,
      chapter_text: CH23_PROSE_INTERIOR,
      ending_hook: '蛮横地撞进了那片未知的黑暗之中',
    }
    const current = {
      chapter_no: 24,
      chapter_goal: '天选者同盟的背叛；清场冲锋入1号楼',
      chapter_text: `
“你是哪个国家的？”
江哲看着瘫软的阿奇姆。通道深处，安德鲁与路易被无头保安追赶。
安德鲁激活替罪羊草偶，红光射向江哲。
江哲一脚震碎无头保安。
【警告！清场倒计时归零！】
他拎起阿奇姆冲向青铜巨门，特权卡爆出黑金光芒。
在青铜巨门彻底咬合、只剩最后一丝缝隙的刹那，门内干瘪尸体吊挂，血肉王座蠕动。
江哲带着阿奇姆，整个人化作一道暴烈的金色雷霆，蛮横地撞进了那片未知的黑暗之中。
`,
    }
    const replay = detectGeneralProgressReplayDirective({ previousChapter: previous, chapter: current })
    expect(replay).toMatchObject({ key: 'progress_replay', severity: 'high' })
    expect(replay?.label).toMatch(/高潮回放|进度回放/)
    expect(replay?.directive).toMatch(/门内|禁止回放|撞门|特权卡/)

    const admission = assessPrimaryOpeningHookContinuity({
      chapterText: current.chapter_text,
      previousChapter: previous,
    })
    expect(admission.required).toBe(true)
    expect(admission.passed).toBe(false)
    expect(admission.failure?.code).toMatch(/progress_climax_replay|opening_primary_hook_miss/)
  })

  test('post-landing opening inside building passes climax replay check', () => {
    const previous = {
      chapter_text: CH23_PROSE_INTERIOR,
      ending_hook: '蛮横地撞进了那片未知的黑暗之中',
    }
    const current = {
      chapter_text: `
江哲已经站在1号楼门内大堂。阿奇姆瘫在他脚边。
吊挂的干瘪尸体在头顶轻轻摇晃，血肉王座在黑暗深处蠕动。
他没有回头看那扇已经闭合的青铜巨门，只是向前走。
`,
    }
    const replay = detectGeneralProgressReplayDirective({ previousChapter: previous, chapter: current })
    expect(replay).toBeNull()
    const miss = detectOpeningHookMissDirective({ previousChapter: previous, chapter: current })
    expect(miss).toBeNull()
  })
})


describe("door threshold free-text handoff", () => {
  test("extracts door_threshold_arrival for footsteps stop at door", () => {
    const previous = {
      chapter_text: `
林序把三张纸全塞进口袋，站直了，准备去把3床的监护仪接上。

脚步声在门外停了。
`,
      ending_hook: "脚步声在门外停了",
    }
    const hooks = extractPrimaryEndingHooks(previous)
    expect(hooks.some((h) => h.key === "door_threshold_arrival" || h.key === "true_ending_forward")).toBe(true)
    expect(hooks[0]?.evidence || "").toMatch(/门外|脚步/)
  })

  test("opening that continues door footsteps passes admission", () => {
    const previous = {
      chapter_text: `
林序把三张纸全塞进口袋，站直了，准备去把3床的监护仪接上。

脚步声在门外停了。
`,
      ending_hook: "脚步声在门外停了",
    }
    const open = `
脚步声在门外停了。林序没立刻应，先把三张纸按进白大褂内侧口袋。

他走过去，手按在门把上，拉开一条缝。门外站着个穿便装的男人，手里拎着一只旧帆布袋。
`
    const miss = detectOpeningHookMissDirective({ previousChapter: previous, chapter: { chapter_text: open } })
    expect(miss).toBeNull()
    const admission = assessPrimaryOpeningHookContinuity({ chapterText: open, previousChapter: previous })
    expect(admission.required).toBe(true)
    expect(admission.passed).toBe(true)
  })

  test("opening that jumps to unrelated mid-plot fails admission", () => {
    const previous = {
      chapter_text: `
林序把三张纸全塞进口袋，站直了，准备去把3床的监护仪接上。

脚步声在门外停了。
`,
      ending_hook: "脚步声在门外停了",
    }
    const open = `
林序把手机手电筒的光束再次压低，照在三张折叠纸条最下端。那两个字母L·X在光斑里显得格外清晰。
他先用拇指和食指捏住015号纸条的边缘，沿着折痕慢慢展开。
`
    const admission = assessPrimaryOpeningHookContinuity({ chapterText: open, previousChapter: previous })
    expect(admission.required).toBe(true)
    expect(admission.passed).toBe(false)
  })
})

  test("ensureOpeningHandoffBridge prefixes door threshold when opening drifts", () => {
    const previous = {
      chapter_text: "林序把三张纸塞进口袋。\n\n脚步声在门外停了。\n",
      ending_hook: "脚步声在门外停了",
    }
    const drifted = "林序把手机手电筒压低，照在三张折叠纸条最下端。他先检查编号。"
    const out = ensureOpeningHandoffBridge(drifted, previous)
    expect(out.bridged).toBe(true)
    expect(out.text).toMatch(/门外|脚步|门把/)
    const admission = assessPrimaryOpeningHookContinuity({ chapterText: out.text, previousChapter: previous })
    expect(admission.passed).toBe(true)
  })
