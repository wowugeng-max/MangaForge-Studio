import { describe, expect, test } from 'bun:test'
import { chapter10HandoffFixture, chapterScaleText } from './fixtures/chapter-10-11-handoff'
import {
  assessInitialProseOpeningContinuity,
  selectContinuitySafeProseCandidate,
} from './prose-candidate-continuity'

const context = {
  previous_handoff: chapter10HandoffFixture.previousChapterTail,
  requiredHandoffAnchors: chapter10HandoffFixture.requiredAnchors,
  scene_cards: [{ transition_from_previous: '暗金绢册继续发热，沈砚和老陈在地下通道处理逼近的铁链声。' }],
}

describe('continuity-safe prose candidate selection', () => {
  test('derives generic handoff anchors across short web-fiction paragraphs', () => {
    const genericContext = {
      previous_handoff: '苏禾留在临江车站，青铜罗盘突然倒转，站台广播开始念她的名字。',
    }
    const original = chapterScaleText('广播又念了一遍。\n\n苏禾攥紧青铜罗盘。\n\n临江车站的出口同时落锁。')
    const candidate = chapterScaleText('晨光落进陌生客厅。\n\n她睁开眼，觉得昨夜像一场梦。')

    expect(selectContinuitySafeProseCandidate(original, candidate, genericContext).accepted).toBe(false)
  })

  test('does not treat a one-word flashback as a causal bridge', () => {
    const genericContext = {
      previous_handoff: '苏禾留在临江车站，青铜罗盘突然倒转。',
      requiredHandoffAnchors: ['临江车站', '苏禾', '青铜罗盘', '罗盘倒转'],
    }
    const original = chapterScaleText('苏禾还在临江车站。\n\n青铜罗盘倒转得越来越快。')
    const candidate = chapterScaleText('三小时后，他想起“罗盘”两个字，随即推开陌生公寓的门。')

    expect(selectContinuitySafeProseCandidate(original, candidate, genericContext).accepted).toBe(false)
  })

  test('keeps the chapter-10/11 connected draft when a rewrite drops the established opening handoff', () => {
    const original = chapterScaleText(chapter10HandoffFixture.continuousCandidateOpening)
    const candidate = chapterScaleText(chapter10HandoffFixture.disconnectedRewriteOpening)
    const selection = selectContinuitySafeProseCandidate(original, candidate, context, { candidate_stage: 'editor' })

    expect(selection.text).toBe(original)
    expect(selection.accepted).toBe(false)
    expect(selection.warning?.code).toBe('opening_continuity_regression')
  })

  test('accepts a synonym-preserving rewrite and a clearly bridged time transition', () => {
    const original = chapterScaleText(chapter10HandoffFixture.continuousCandidateOpening)
    const synonym = chapterScaleText('金色旧册贴着胸口再次升温，沈砚扶住陈叔，在地底甬道循着锁链摩擦声后退。')
    const bridged = chapterScaleText('三小时后，沈砚才从地下通道转移到医院。老陈守在门外，暗金绢册仍隔着衣襟发热。')

    const aliasedContext = {
      ...context,
      requiredHandoffAnchorGroups: [
        ['地下通道', '地底甬道'],
        ['老陈', '陈叔'],
        ['暗金绢册', '金色旧册'],
        ['铁链', '锁链'],
        ['发热', '升温'],
      ],
    }

    expect(selectContinuitySafeProseCandidate(original, synonym, aliasedContext).accepted).toBe(true)
    expect(selectContinuitySafeProseCandidate(original, bridged, context).accepted).toBe(true)
  })

  test('safely keeps the old draft when production-shaped synonyms have no structured aliases', () => {
    const original = chapterScaleText(chapter10HandoffFixture.continuousCandidateOpening)
    const synonym = chapterScaleText('金色旧册贴着胸口再次升温，沈砚扶住陈叔，在地底甬道循着锁链摩擦声后退。')
    expect(selectContinuitySafeProseCandidate(original, synonym, context).accepted).toBe(false)
  })

  test('does not accept merely similar words when two independent handoff states are not preserved', () => {
    const original = chapterScaleText('苏禾守在临江车站。\n\n青铜罗盘正在倒转。')
    const candidate = chapterScaleText('苏青走进临江商场。\n\n她拿起铜色餐盘。')
    const similarContext = { requiredHandoffAnchors: ['苏禾', '临江车站', '青铜罗盘', '罗盘倒转'] }
    expect(selectContinuitySafeProseCandidate(original, candidate, similarContext).accepted).toBe(false)
  })

  test('rejects underground-market and decorative-book word-shape bypasses', () => {
    const original = chapterScaleText(chapter10HandoffFixture.continuousCandidateOpening)
    const candidate = chapterScaleText('陈叔走进地下商道，暗金花册压在婚礼签到台上，主持人宣布仪式开始。')
    expect(selectContinuitySafeProseCandidate(original, candidate, context).accepted).toBe(false)
  })

  test('rejects above-ground passage and picture-book event-name bypasses', () => {
    const original = chapterScaleText(chapter10HandoffFixture.continuousCandidateOpening)
    const candidate = chapterScaleText('陈叔站在地上通道，暗金画册摆在发布会讲台上，灯光随即亮起。')
    expect(selectContinuitySafeProseCandidate(original, candidate, context).accepted).toBe(false)
  })

  test('does not let an oven temperature change stand in for the carried item state', () => {
    const original = chapterScaleText(chapter10HandoffFixture.continuousCandidateOpening)
    const candidate = chapterScaleText('陈叔退进地底甬道，烤箱正在升温，他催沈砚快走。')
    expect(selectContinuitySafeProseCandidate(original, candidate, context).accepted).toBe(false)
  })

  test('does not let hot water stand in for the carried item state', () => {
    const original = chapterScaleText(chapter10HandoffFixture.continuousCandidateOpening)
    const candidate = chapterScaleText('陈叔退进地底甬道，锅里的水变烫了，他催沈砚快走。')
    expect(selectContinuitySafeProseCandidate(original, candidate, context).accepted).toBe(false)
  })

  for (const [handoff, originalOpening] of [
    ['周岚困在负二层，铜钥匙卡在门锁里，电梯正在下行。', '周岚还在负二层。\n\n铜钥匙拧不动，电梯下行声越来越近。'],
    ['顾九护着阿梨退进窄巷，追兵已经封住前后出口。', '顾九把阿梨挡在身后。\n\n追兵从窄巷两端同时逼近。'],
  ]) {
    test(`uses exact relative handoff coverage to reject a disconnected generic rewrite: ${handoff.slice(0, 2)}`, () => {
      const original = chapterScaleText(originalOpening)
      const candidate = chapterScaleText('天亮后，他在陌生办公室醒来，桌上放着一份新合同。')
      expect(selectContinuitySafeProseCandidate(original, candidate, { previous_handoff: handoff }).accepted).toBe(false)
    })
  }

  for (const wrongItem of ['相册', '账册', '名册']) {
    test(`does not bind temperature state to a merely same-suffix item: ${wrongItem}`, () => {
      const original = chapterScaleText(chapter10HandoffFixture.continuousCandidateOpening)
      const candidate = chapterScaleText(`老陈仍在地下通道，${wrongItem}突然升温，铁链声从远处传来。`)
      expect(selectContinuitySafeProseCandidate(original, candidate, context).accepted).toBe(false)
    })
  }

  test('does not police a weak original opening that never established two handoff anchors', () => {
    const original = chapterScaleText('沈砚向前走去。')
    const candidate = chapterScaleText(chapter10HandoffFixture.disconnectedRewriteOpening)
    expect(selectContinuitySafeProseCandidate(original, candidate, context).accepted).toBe(true)
  })

  test('does not accept a bare time jump that explains none of the established handoff state', () => {
    const original = chapterScaleText(chapter10HandoffFixture.continuousCandidateOpening)
    const candidate = chapterScaleText('三小时后，剧痛从骨髓深处炸开，他在陌生白房间里醒来。')
    expect(selectContinuitySafeProseCandidate(original, candidate, context).accepted).toBe(false)
  })

  for (const disconnectedOpening of [
    '沈砚看见照片里的暗金绢册正在发热，背景正是地下通道，老陈站在角落。可那只是旧照片。此刻他在白色病房里醒来。',
    '暗金绢册仍在发热。老陈和地下通道已经是三年前的事。沈砚推开新公司的门。',
    '老陈发来的消息里写着：地下通道中的暗金绢册仍在发热。沈砚没有回复，转身参加婚礼。',
  ]) {
    test(`rejects surface-only handoff mentions outside the current action chain: ${disconnectedOpening.slice(0, 8)}`, () => {
      const original = chapterScaleText(chapter10HandoffFixture.continuousCandidateOpening)
      const candidate = chapterScaleText(disconnectedOpening)
      expect(selectContinuitySafeProseCandidate(original, candidate, context).accepted).toBe(false)
    })
  }

  test('rejects a disconnected initial draft when the chapter has a strong handoff obligation', () => {
    const assessment = assessInitialProseOpeningContinuity(
      chapterScaleText(chapter10HandoffFixture.disconnectedRewriteOpening),
      context,
    )

    expect(assessment).toMatchObject({ required: true, passed: false })
    expect(assessment.failure).toMatchObject({
      code: 'opening_handoff_disconnected',
      source: 'canonical_continuity',
    })
  })

  test('accepts a connected initial draft and does not enforce weak handoff context', () => {
    expect(assessInitialProseOpeningContinuity(
      chapterScaleText(chapter10HandoffFixture.continuousCandidateOpening),
      context,
    )).toMatchObject({ required: true, passed: true, failure: null })
    expect(assessInitialProseOpeningContinuity(
      chapterScaleText(chapter10HandoffFixture.disconnectedRewriteOpening),
      { previous_handoff: '他走了。' },
    )).toMatchObject({ required: false, passed: true, failure: null })
  })

  test('accepts connected hospital key handoff and rejects skip-to-new-goal opening', () => {
    const hospitalContext = {
      chapter_target: {
        previous_handoff: '第4章《深夜的查房风波》 章末钩子：护士在地上痛苦地爬行，身体开始融化，江哲一脚踩在她的头上，冷冷地问：“医生办公室的钥匙在哪？”；最后一幕：' + '他俯下身子继续逼问钥匙。'.repeat(20),
        scene_cards: [{ scene_no: 1, title: '目标入场', purpose: '查看医生守则' }],
      },
      continuity: {
        previous_chapter: {
          ending_hook: '护士在地上痛苦地爬行，身体开始融化，江哲一脚踩在她的头上，冷冷地问：“医生办公室的钥匙在哪？”',
        },
      },
    }
    const connected = chapterScaleText('江哲一脚仍踩在融化的护士头上，冷冷问医生办公室的钥匙在哪。护士颤着交出钥匙，身体还在冒白烟。')
    const skipped = chapterScaleText('江哲握着钥匙扫过《医生守则》，决定今晚去治愈重症患者，反客为主。')
    const surfaceOnly = chapterScaleText('旧照片里的江哲一脚踩着融化的护士，旁边写着医生办公室的钥匙。那只是旧档案。此刻他已经翻开《医生守则》。')
    expect(assessInitialProseOpeningContinuity(surfaceOnly, hospitalContext)).toMatchObject({ required: true, passed: false })
    expect(assessInitialProseOpeningContinuity(connected, hospitalContext)).toMatchObject({ required: true, passed: true, failure: null })
    expect(assessInitialProseOpeningContinuity(skipped, hospitalContext)).toMatchObject({ required: true, passed: false })
  })

  test('accepts connected ch5->ch6 baton handoff and rejects ICU skip', () => {
    const hospitalCorridorContext = {
      chapter_target: {
        previous_handoff: '第5章《医患身份的颠倒逻辑》 章末钩子：江哲走出病房，迎面撞上了巡逻的保安诡异，保安手里拿着电击棍，狞笑着向江哲走来。',
        goal: '保安诡异试图用高压电击棍制服江哲，江哲吸入高压电后一路来到重症监护室，准备开始物理治疗。',
        scene_cards: [{ scene_no: 1, title: '物理治疗', purpose: '进入重症监护室对怪物开始物理治疗' }],
      },
      continuity: {
        previous_chapter: {
          ending_hook: '江哲走出病房，迎面撞上了巡逻的保安诡异，保安手里拿着电击棍，狞笑着向江哲走来。',
          ending_excerpt: '宵禁时间。巡逻保安手中的电击棍拥有绝对的判定。保安诡异狞笑着，电击棍高高举起，狠狠砸下！江哲站在原地。',
        },
      },
    }
    const connected = chapterScaleText('保安诡异狞笑着举起电击棍砸下。江哲单手握住电击棍，将高压电吸入体内，顺手把保安扔进垃圾桶。')
    const skipped = chapterScaleText('江哲一路来到重症监护室。里面躺着一个浑身长满肿瘤的怨憎级怪物，他准备开始物理治疗。')
    const surfaceOnly = chapterScaleText('档案里记录着保安诡异狞笑着举起电击棍砸下。那已经是多年前的旧事。江哲此刻直接进入重症监护室。')
    const singleActorOnly = chapterScaleText('保安诡异站在走廊里。江哲直接进入重症监护室。')
    const overlappingActorOnly = chapterScaleText('巡逻保安诡异站在走廊里。江哲直接进入重症监护室。')
    const dreamOnly = chapterScaleText('梦境中，保安诡异狞笑着举起电击棍砸下。江哲醒来后直接进入重症监护室。')
    const pastOnly = chapterScaleText('多年前，保安诡异狞笑着举起电击棍砸下。现在江哲直接进入重症监护室。')
    const splitDreamOnly = chapterScaleText('梦境中。保安诡异狞笑着举起电击棍砸下。江哲醒来后直接进入重症监护室。')
    const splitPastOnly = chapterScaleText('多年前。保安诡异狞笑着举起电击棍砸下。现在江哲直接进入重症监护室。')
    const splitArchiveOnly = chapterScaleText('旧档案。内容记载着保安诡异狞笑着举起电击棍砸下。此刻江哲直接进入重症监护室。')
    const disconnectedResults = [
      surfaceOnly,
      singleActorOnly,
      overlappingActorOnly,
      dreamOnly,
      pastOnly,
      splitDreamOnly,
      splitPastOnly,
      splitArchiveOnly,
    ]
      .map(text => assessInitialProseOpeningContinuity(text, hospitalCorridorContext))
      .map(result => ({ required: result.required, passed: result.passed }))
    expect(disconnectedResults).toEqual(Array.from(
      { length: 8 },
      () => ({ required: true, passed: false }),
    ))

    const tailBoundedContext = {
      ...hospitalCorridorContext,
      continuity: {
        previous_chapter: {
          ending_hook: '空气里传来一声异响，未知威胁正在逼近。',
          ending_excerpt: `${'墙上的灰尘纹丝不动。'.repeat(500)}保安诡异狞笑着举起电击棍砸下。墙边警铃突然爆响。`,
        },
      },
    }
    const tailConnected = chapterScaleText('保安诡异狞笑着挥下电击棍。墙边警铃跟着爆响。')
    expect(assessInitialProseOpeningContinuity(tailConnected, tailBoundedContext)).toMatchObject({ required: true, passed: true, failure: null })
    expect(assessInitialProseOpeningContinuity(connected, hospitalCorridorContext)).toMatchObject({ required: true, passed: true, failure: null })
    expect(assessInitialProseOpeningContinuity(skipped, hospitalCorridorContext)).toMatchObject({ required: true, passed: false })
  })


  test('accepts connected ch8->ch9 fragment-eye handoff and rejects carnival result-skip', () => {
    const context = {
      continuity: {
        previous_chapter: {
          chapter_no: 8,
          ending_hook: '在江哲的物理威胁下，院长颤抖着签下了“医院改制声明”，整个副本空间开始剧烈颤抖，一道金光从院长体内剥离出来。',
          ending_excerpt: '江哲手指即将触碰到那枚权柄碎片。金色碎片内突然睁开一只冰冷巨眼，古老意志隔着虚空轰然降临！',
          outgoing_handoff: {
            version: 'chapter_outgoing_handoff_v1',
            source: 'chapter_text_tail',
            unresolved_action: '江哲手指即将触碰到那枚权柄碎片。金色碎片内突然睁开一只冰冷巨眼，古老意志隔着虚空轰然降临！',
            anchors: ['权柄碎片', '巨眼', '江哲', '古老意志'],
            ending_excerpt: '江哲手指即将触碰到那枚权柄碎片。金色碎片内突然睁开一只冰冷巨眼，古老意志隔着虚空轰然降临！',
            declared_hook: '院长签下医院改制声明，金光剥离。',
            hook_tail_divergence: true,
            confidence: 0.92,
          },
        },
      },
      chapter_target: {
        goal: '江哲成功夺取第一枚世界权柄碎片，完美通关，迷雾退散，举国狂欢。',
        scene_cards: [{ scene_no: 1, purpose: '通关后举国狂欢' }],
      },
    }
    const connected = chapterScaleText('江哲手指将触权柄碎片时，碎片内猛地睁开冰冷巨眼。古老意志隔空压来，他眼神一凝，没有退开。')
    const skipped = chapterScaleText('青山精神病院完美通关，大夏国北方迷雾退散，全球直播间沸腾，举国狂欢。编织者在虚空中睁眼。')
    expect(assessInitialProseOpeningContinuity(connected, context)).toMatchObject({ required: true, passed: true, failure: null })
    expect(assessInitialProseOpeningContinuity(skipped, context)).toMatchObject({ required: true, passed: false })
  })


  test('does not double-block initial draft when hard primary ending hook already passed', () => {
    const previousText = `
江哲站在大堂中央。通往2号楼的走廊血雾翻滚。
红衣级怪谈——2号楼保安队长！它拖着巨型消防斧，脸中央是一只巨大猩红眼球。
“找到……你们了……”
抹杀规则轰然降临！
`.repeat(3)
    const context = {
      continuity: {
        previous_chapter: {
          chapter_no: 25,
          chapter_text: previousText,
          ending_hook: '2号楼保安队长（寻找者）降临大堂，抹杀规则锁定江哲',
        },
      },
      chapter_target: {
        previous_handoff: previousText.slice(-500),
        requiredHandoffAnchors: ['暗金绢册', '地下通道', '老陈', '发热', '白色病房', '沈砚'],
        scene_cards: [{ scene_no: 1, purpose: '对峙寻找者', characters_present: ['江哲'], location: '大堂' }],
      },
    }
    const connected = chapterScaleText('抹杀规则的红光笼罩江哲。2号楼保安队长的猩红眼球死死锁住他，消防斧高高抬起。江哲双手插兜，冷声道：“来。”')
    // Even if unrelated required anchors from another story are injected, primary hard-hook pass owns admission.
    expect(assessInitialProseOpeningContinuity(connected, context)).toMatchObject({ required: true, passed: true, failure: null })
    const skipped = chapterScaleText('青山精神病院完美通关，大夏国北方迷雾退散，举国狂欢。')
    expect(assessInitialProseOpeningContinuity(skipped, context)).toMatchObject({ required: true, passed: false })
  })


})
