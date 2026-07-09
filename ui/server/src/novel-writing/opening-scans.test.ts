import { describe, expect, test } from 'bun:test'
import {
  scanOpeningEventDensityRisks,
  scanOpeningFirst50ConflictRisks,
  scanOpeningHookRisks,
  scanOpeningProtagonistDelayRisks,
} from './opening-scans'

describe('opening scan utilities', () => {
  test('detects slow scenery or daily-life openings before the story hook lands', () => {
    const checks = scanOpeningHookRisks([
      '第3章 校门外',
      '',
      '清晨的阳光落在教学楼外，风吹过空荡的操场，窗外的树影慢慢晃动。',
      '李辰照常走进教室，把书包塞进抽屉。',
      '他翻开课本，又把昨天夹好的练习册摊平，粉笔灰从讲台边缘落下来。',
      '走廊里没有脚步声，值日表还贴在门后，所有座位都像平时一样安静。',
      '直到广播响起，所有人才意识到规则变了。',
    ].join('\n'))

    expect(checks.map((item: any) => item.key)).toEqual(expect.arrayContaining([
      'opening_scenery_or_daily_start',
      'opening_hook_deadline',
    ]))
    expect(checks[0].fix).toContain('前100字')
  })

  test('detects openings without conflict in the first 50 characters but ignores visible abnormality', () => {
    const slowChecks = scanOpeningFirst50ConflictRisks([
      '第1章 旧楼铃声',
      '',
      '清晨的光落在旧楼台阶上，李岚把钥匙放进口袋，沿着空荡走廊慢慢往前走。',
      '直到门后响起第二个人的呼吸声，他才停下。',
    ].join('\n'))
    const activeChecks = scanOpeningFirst50ConflictRisks([
      '第1章 旧楼铃声',
      '',
      '门后突然传来第二个人的呼吸声，李岚握紧钥匙，听见锁孔里有人喊他的名字。',
      '清晨的光这才落到旧楼台阶上。',
    ].join('\n'))

    expect(slowChecks).toHaveLength(1)
    expect(slowChecks[0].key).toBe('opening_first50_conflict_missing')
    expect(slowChecks[0].fix).toContain('冲突')
    expect(activeChecks).toHaveLength(0)
  })

  test('detects low event density in the first 100 characters', () => {
    const checks = scanOpeningEventDensityRisks([
      '第3章 校门外',
      '广播响了一声。',
      '走廊的灯光仍旧昏暗，墙皮被雨水泡出细小的裂纹，值夜名单贴在门边，空气里全是潮湿的铁锈味。',
      '李辰站在门口，想到昨天的规则还没有解释清楚。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('opening_event_density_low')
    expect(checks[0].evidence).toContain('事件数')
    expect(checks[0].fix).toContain('至少 3 个事件')
  })

  test('detects openings where the protagonist does not enter within the first 300 characters', () => {
    const checks = scanOpeningProtagonistDelayRisks([
      '第1章 旧校规',
      '',
      '午夜教学楼的广播忽然响起，走廊尽头的红灯一盏接一盏亮起。',
      '校规贴在玻璃门内侧，第一行写着：十点后不得单独离开宿舍。',
      '值夜名单被雨水泡皱，名字旁边的黑点像干涸的血。',
      '三楼钟声停在九点五十九分，楼梯口的安全门自己锁上。',
      '规则册第二页翻开，惩罚栏只剩一行空白。',
      '旧校徽在门缝里轻轻震动，金属背面刻着上一届失踪学生的编号。',
      '宿舍区的电闸一排排跳下去，墙上的考勤屏只剩红色倒影。',
      '第五条校规被墨水盖住半截，只露出“不得回应门外的人”。',
      '公告栏最底下贴着一张旧照片，照片里的操场空无一人，旗杆影子却多出两道。',
      '每一间宿舍门牌都变成同一个数字，走廊尽头的水管开始往外渗黑水。',
      '广播把校规重复到第六遍，惩罚栏里的空白慢慢浮出一枚陌生指纹。',
      '直到第六遍广播响完，李辰才从宿舍床上坐起。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('opening_protagonist_delayed')
    expect(checks[0].evidence).toContain('前300字')
    expect(checks[0].fix).toContain('主角')
  })
})
