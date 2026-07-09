import { describe, expect, test } from 'bun:test'

import {
  scanEndingHookRisks,
  scanEntryPromiseAlignmentRisks,
  scanOpeningConflictAlignmentRisks,
  scanOpeningHookEchoRisks,
  scanParagraphHookStallRisks,
  scanSuddenEndingClueRisks,
} from './hook-alignment-scans'

describe('hook and alignment deterministic scans', () => {
  test('detects early openings that miss the title synopsis entry promise', () => {
    const checks = scanEntryPromiseAlignmentRisks(
      {
        title: '血缘系统：我有三位隐藏妈妈',
        synopsis: '主角开局被裁员后觉醒血缘系统，第一次检测就发现三位妈妈身份反常。',
      },
      {
        chapter_target: {
          chapter_no: 1,
          title: '旧楼铃声',
        },
      },
      [
        '第1章 旧楼铃声',
        '',
        '李岚推开旧楼的门，走廊里只有一盏坏掉的灯。',
        '',
        '广播重复着陌生的校规，所有人必须在十点前回到房间。',
      ].join('\n'),
    )

    expect(checks[0]?.key).toBe('entry_promise_mismatch')
    expect(checks[0]?.evidence).toContain('血缘系统')
  })

  test('uses runtime camelCase chapterTarget over stale chapter_target for entry promise alignment', () => {
    const checks = scanEntryPromiseAlignmentRisks(
      { title: '旧楼铃声' },
      {
        chapter_target: { chapter_no: 12 },
        chapterTarget: {
          chapterNo: 1,
          readerPromise: '血缘系统第一次检测揭开三位妈妈身份反转。',
        },
      },
      '第1章 旧楼铃声\n\n李岚推开旧楼的门，走廊里只有一盏坏掉的灯。',
    )

    expect(checks[0]?.key).toBe('entry_promise_mismatch')
  })

  test('detects openings that do not surface the planned core conflict early', () => {
    const checks = scanOpeningConflictAlignmentRisks({
      preDraftBrief: {
        coreConflict: '执事设局阻拦主角参加试炼',
      },
    }, [
      '第12章 试炼资格',
      '',
      '晨光落在演武场边，石阶被雨水洗得发亮。',
      '李玄把书册收进袖中，沿着长廊往前走。',
      '远处钟声响了三下，弟子们陆续聚到看台下。',
    ].join('\n'))

    expect(checks[0]?.key).toBe('opening_core_conflict_missing')
    expect(checks[0]?.evidence).toContain('执事设局阻拦主角参加试炼')
  })

  test('detects summary-style endings that do not leave a page-turn hook', () => {
    const checks = scanEndingHookRisks([
      '李辰关上门，教室终于安静下来。',
      '经历了这一切，他明白自己必须更加努力。',
      '新的生活才刚刚开始。',
    ].join('\n'))

    expect(checks.some(item => item.key === 'ending_summary_without_hook')).toBe(true)
    expect(checks.some(item => item.key === 'ending_hook_missing')).toBe(true)
  })

  test('detects important clues that suddenly appear at the ending without warmup', () => {
    const checks = scanSuddenEndingClueRisks([
      '第8章 审判庭',
      '',
      '李玄把执事逼退半步，审判庭终于安静下来。',
      '',
      '众人开始整理散落的卷宗，林青禾低声问他下一步怎么办。',
      '',
      '他正要离开，桌下突然掉出第二本账册，夹页里还露出禁地钥匙。',
    ].join('\n'))

    expect(checks[0]?.key).toBe('sudden_ending_clue_without_warmup')
  })

  test('detects opening hooks that are neither paid off nor carried forward at the ending', () => {
    const checks = scanOpeningHookEchoRisks([
      '第10章 公审台',
      '',
      '证据刚摆上桌就被执事当众撕毁，碎纸落在李辰脚边。',
      '',
      '台下的人跟着起哄，催他立刻认罪。',
      '',
      '李辰穿过侧门，按照旧流程完成了内门报名。',
      '',
      '夜色落下来，他终于可以回去休息。',
    ].join('\n'))

    expect(checks[0]?.key).toBe('opening_hook_not_echoed')
    expect(checks[0]?.evidence).toContain('证据')
  })

  test('detects consecutive paragraphs without paragraph-level hook signals', () => {
    const checks = scanParagraphHookStallRisks([
      '第8章 雨夜',
      '',
      '雨水顺着旧楼外墙往下淌，窗框边缘积着灰。',
      '',
      '走廊尽头的灯亮得很慢，墙面被照出一层发黄的斑。',
      '',
      '李辰站在门边，衣袖被冷风吹得贴住手腕。',
      '',
      '桌上的课本摊开着，纸页边角微微卷起。',
      '',
      '广播忽然响起：“十秒后核验身份。”',
    ].join('\n'))

    expect(checks[0]?.key).toBe('paragraph_hook_stall_1_4')
  })
})
