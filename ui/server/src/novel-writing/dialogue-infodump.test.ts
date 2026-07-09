import { describe, expect, test } from 'bun:test'
import { scanDialogueInfodumpRisks } from './dialogue-infodump'

describe('dialogue infodump scan utilities', () => {
  test('detects dialogue that turns into exposition instead of agenda or conflict', () => {
    const checks = scanDialogueInfodumpRisks([
      '第7章 管理员',
      '',
      '管理员推了推眼镜，说：“规则塔体系分为三层，第一层负责记录学生身份，第二层负责校验夜间行动权限，第三层会根据违规次数触发不同惩罚。这个机制来自旧校区契约，因此所有进入教学楼的人都会被自动纳入名单，通常只有管理员才能修改。”',
      '',
      '广播在他身后响了一声。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('dialogue_infodump_line_3')
    expect(checks[0].label).toBe('说明书式对白扫描')
    expect(checks[0].evidence).toContain('规则塔体系')
    expect(checks[0].fix).toContain('对白')
  })

  test('detects short consecutive science-mouth dialogue without pressure action or evidence', () => {
    const scienceMouthChecks = scanDialogueInfodumpRisks([
      '第7章 管理员',
      '"规则塔的权限分为三层，学生只能进入第一层。"',
      '"第二层负责校验夜间行动名单，第三层触发惩罚机制。"',
      '"这个体系来自旧校区契约，因此管理员通常能修改身份记录。"',
      '走廊里很安静，三个人都站在原地听完。',
    ].join('\n'))
    const embeddedChecks = scanDialogueInfodumpRisks([
      '第7章 管理员',
      '"为什么我的名字在第二层名单里？"',
      '管理员刚要开口，广播忽然响起，墙上的身份灯从白色跳成红色。',
      '"看见了吗？第二层只校验夜间行动，红灯说明有人刚改过你的权限。"',
      '李辰按住门锁，血从指缝里渗出来。',
    ].join('\n'))

    expect(scienceMouthChecks).toHaveLength(1)
    expect(scienceMouthChecks[0].key).toBe('dialogue_science_mouth_lines_2_4')
    expect(scienceMouthChecks[0].label).toBe('信息型配角科普嘴扫描')
    expect(scienceMouthChecks[0].evidence).toContain('权限分为三层')
    expect(scienceMouthChecks[0].fix).toContain('压力下挤出的半句话')
    expect(embeddedChecks).toHaveLength(0)
  })
})
