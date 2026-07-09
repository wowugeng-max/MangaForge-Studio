import { describe, expect, test } from 'bun:test'
import {
  scanCombatProcessRisks,
  scanSceneDensityExecutionRisks,
  scanSceneGoalObstacleChangeRisks,
  scanScenePurposeWeightRisks,
  textHasSceneChange,
  textHasSceneGoal,
  textHasSceneObstacle,
} from './scene-action-scans'

describe('scene action scan utilities', () => {
  test('exports reusable scene goal obstacle and change detectors for preflight repair', () => {
    expect(textHasSceneGoal('主角必须在十秒内找到正确门牌')).toBe(true)
    expect(textHasSceneGoal('走廊的灯慢慢亮起来')).toBe(false)
    expect(textHasSceneObstacle('管理员堵在楼梯口，否则名单会消失')).toBe(true)
    expect(textHasSceneObstacle('风从窗缝里吹进来')).toBe(false)
    expect(textHasSceneChange('门牌从404变成档案室编号，权限生效')).toBe(true)
    expect(textHasSceneChange('他站在门边看了一会儿')).toBe(false)
  })

  test('detects scenes without visible goal obstacle or state change', () => {
    const checks = scanSceneGoalObstacleChangeRisks([
      '第4章 旧楼走廊',
      '',
      '李辰站在旧楼走廊里，墙上的灯一盏接一盏亮起。',
      '',
      '张智看着门牌，门牌上的数字慢慢变得模糊。',
      '',
      '楼下传来风声，空气里有一股潮湿的铁锈味。',
      '',
      '两个人都没有说话，只觉得这里比刚才更冷。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('scene_goal_obstacle_change_missing')
    expect(checks[0].label).toBe('场景目标阻碍变化扫描')
    expect(checks[0].evidence).toContain('缺少目标')
    expect(checks[0].fix).toContain('人物要什么')
    expect(checks[0].fix).toContain('什么挡着')
    expect(checks[0].fix).toContain('结束后不同')
  })

  test('does not flag scenes with a goal obstacle and changed state', () => {
    const checks = scanSceneGoalObstacleChangeRisks([
      '第4章 旧楼走廊',
      '',
      '李辰必须在十秒内找到正确门牌，否则张智的名字会从名单上消失。',
      '',
      '管理员堵在楼梯口，抬手按住感应器：“没有权限的人不能进档案室。”',
      '',
      '李辰把刚拿到的钥匙插进反向锁孔，门牌从404变成了档案室编号。',
      '',
      '广播随即改口：“临时权限已生效，下一轮核验提前。”',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('detects combat scenes that skip action process and only report the result', () => {
    const checks = scanCombatProcessRisks([
      '第12章 试炼台',
      '',
      '李玄拔剑冲上去。',
      '',
      '一招过后，执事倒在地上，战斗结束。',
      '',
      '台下众人全都安静下来。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('combat_process_missing_1_3')
    expect(checks[0].label).toBe('战斗过程扫描')
    expect(checks[0].evidence).toContain('一招过后')
    expect(checks[0].fix).toContain('起手')
    expect(checks[0].fix).toContain('对手反应')
    expect(checks[0].fix).toContain('空间')
    expect(checks[0].fix).toContain('反制')
  })

  test('does not flag combat scenes with action reaction space and result', () => {
    const checks = scanCombatProcessRisks([
      '第12章 试炼台',
      '',
      '李玄侧身避开阵光，剑尖贴着石阶挑起火星。',
      '',
      '执事抬臂格挡，袖口被划开，脚跟撞上台阶边缘。',
      '',
      '李玄借台阶换位，反手刺穿阵眼。',
      '',
      '阵光熄灭，执事踉跄退后，手里的名册掉在地上。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('detects scene-card density levels that are executed with the wrong prose weight', () => {
    const checks = scanSceneDensityExecutionRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '当众反证',
            density_level: 'dense',
            reader_payoff: '江辰用第二本账册当众反证，逼执事改口。',
            required_beats: ['第二本账册亮相', '执事改口', '旁观弟子倒戈'],
          },
          {
            scene_no: 2,
            title: '赶往钟楼',
            density_level: 'sparse',
            purpose: '江辰赶往钟楼交接旧印。',
          },
        ],
      },
    }, [
      '第12章 旧账册',
      '',
      '江辰把第二本账册举起来，当众反证。执事脸色一变，只能改口，旁观弟子倒戈。',
      '',
      '江辰赶往钟楼交接旧印。',
      '',
      '雨水从青石板缝里漫上来，他的靴底碾过一道道旧痕，钟楼的阴影像一截潮湿的铁尺压在肩上。',
      '',
      '他穿过廊桥，风从袖口灌进去，旧印被攥得发烫，每一步都像踩在昨夜没熄的灰烬里。',
      '',
      '远处的钟声拖得很长，檐角的水珠一颗一颗落下，砸在他手背上。',
    ].join('\n'))

    expect(checks.map(item => item.key)).toEqual(['scene_density_1_dense_underwritten', 'scene_density_2_sparse_overwritten'])
    expect(checks[0].evidence).toContain('当众反证')
    expect(checks[0].fix).toContain('慢镜头')
    expect(checks[1].evidence).toContain('赶往钟楼')
    expect(checks[1].fix).toContain('1-2 句')
  })

  test('does not flag scene-card density when dense and sparse scenes use matching prose weight', () => {
    const checks = scanSceneDensityExecutionRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '当众反证',
            density_level: 'dense',
            reader_payoff: '江辰用第二本账册当众反证，逼执事改口。',
            required_beats: ['第二本账册亮相', '执事改口', '旁观弟子倒戈'],
          },
          {
            scene_no: 2,
            title: '赶往钟楼',
            density_level: 'sparse',
            purpose: '江辰赶往钟楼交接旧印。',
          },
        ],
      },
    }, [
      '第12章 旧账册',
      '',
      '江辰把第二本账册压在审判台上，纸页被掌风掀开，第一行墨迹正对着执事的名字。',
      '',
      '执事伸手去抢，江辰反扣住他的腕骨，把账册翻到朱印页：“你昨夜换的是副本，真账在这里。”',
      '',
      '台下弟子先是屏住呼吸，等旁证签名一露出来，最前排那人立刻后退半步，低声喊出执事的称号。',
      '',
      '执事嘴唇抖了两下，喉结卡在领口上方，半晌才把“误会”两个字咬出来。江辰没有松手，只把账册往前推了半寸，让每个人都看清朱印旁边的刮痕。',
      '',
      '原本站在执事身后的两名弟子同时退开，旁观席里有人把刚才的供词撕成两半，倒向江辰这一侧。',
      '',
      '江辰赶往钟楼交接旧印。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('detects scene-card purpose tags that are executed with the wrong prose weight', () => {
    const checks = scanScenePurposeWeightRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '当众反证',
            purpose_tag: '打脸',
            purpose: '江辰用第二本账册当众反证。',
            reader_payoff: '执事改口，旁观弟子倒戈。',
          },
          {
            scene_no: 2,
            title: '赶往钟楼',
            purpose_tag: '过渡',
            purpose: '江辰赶往钟楼交接旧印。',
          },
        ],
      },
    }, [
      '第12章 旧账册',
      '',
      '江辰拿出第二本账册，执事改口，众人震惊。',
      '',
      '江辰赶往钟楼交接旧印。',
      '',
      '雨水从青石板缝里漫上来，他的靴底碾过一道道旧痕，钟楼的阴影像一截潮湿的铁尺压在肩上。',
      '',
      '他穿过廊桥，风从袖口灌进去，旧印被攥得发烫，每一步都像踩在昨夜没熄的灰烬里。',
      '',
      '远处的钟声拖得很长，檐角的水珠一颗一颗落下，砸在他手背上。',
    ].join('\n'))

    expect(checks.map(item => item.key)).toEqual(['scene_purpose_weight_1_high_underwritten', 'scene_purpose_weight_2_transition_overwritten'])
    expect(checks[0].evidence).toContain('目的词「打脸」')
    expect(checks[0].fix).toContain('危机/期待铺垫')
    expect(checks[1].evidence).toContain('目的词「过渡」')
    expect(checks[1].fix).toContain('1-2 句')
  })

  test('does not flag scene-card purpose weight when payoff scenes expand and transitions stay brief', () => {
    const checks = scanScenePurposeWeightRisks({
      chapter_target: {
        scene_cards: [
          {
            scene_no: 1,
            title: '当众反证',
            purpose_tag: '打脸',
            purpose: '江辰用第二本账册当众反证。',
            reader_payoff: '执事改口，旁观弟子倒戈。',
          },
          {
            scene_no: 2,
            title: '赶往钟楼',
            purpose_tag: '过渡',
            purpose: '江辰赶往钟楼交接旧印。',
          },
        ],
      },
    }, [
      '第12章 旧账册',
      '',
      '江辰把第二本账册压在审判台上，纸页被掌风掀开，第一行墨迹正对着执事的名字。',
      '',
      '执事伸手去抢，江辰反扣住他的腕骨，把账册翻到朱印页：“你昨夜换的是副本，真账在这里。”',
      '',
      '台下弟子先是屏住呼吸，等旁证签名一露出来，最前排那人立刻后退半步，低声喊出执事的称号。',
      '',
      '执事嘴唇抖了两下，喉结卡在领口上方，半晌才把“误会”两个字咬出来。江辰没有松手，只把账册往前推了半寸。',
      '',
      '原本站在执事身后的两名弟子同时退开，旁观席里有人把刚才的供词撕成两半，倒向江辰这一侧。',
      '',
      '江辰赶往钟楼交接旧印。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
})
