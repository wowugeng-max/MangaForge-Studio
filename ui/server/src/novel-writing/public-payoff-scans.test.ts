import { describe, expect, test } from 'bun:test'
import {
  buildPayoffSetupSyncReport,
  buildSpectatorReactionSyncReport,
  scanPayoffSetupRisks,
  scanShockLayeringRisks,
  scanSpectatorReactionDifferentiationRisks,
} from './public-payoff-scans'

describe('public payoff deterministic scans', () => {
  test('detects crowd-only shock without layered observer payoff', () => {
    const checks = scanShockLayeringRisks([
      '第9章 公审台',
      '',
      '李辰把检测报告摔在桌上，屏幕里的数值一路飙红。',
      '',
      '全场瞬间震惊，所有人都倒吸一口凉气，现场一片哗然。',
      '',
      '众人面面相觑，没有人说得出话来。',
      '',
      '他收回报告，转身走下台。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0]).toMatchObject({
      key: 'shock_layering_crowd_only_2',
      label: '震惊分层扫描',
      status: 'warn',
    })
    expect(checks[0].evidence).toContain('全场瞬间震惊')
    expect(checks[0].fix).toContain('围观者质量层级')
  })

  test('does not flag shock when an expert observer reveals why it matters', () => {
    const checks = scanShockLayeringRisks([
      '第9章 公审台',
      '',
      '李辰把检测报告摔在桌上，屏幕里的数值一路飙红。',
      '',
      '全场瞬间震惊，所有人都倒吸一口凉气。',
      '',
      '主考官脸色变了：“这个数值意味着他不是作弊，而是把旧记录翻了三倍。”',
      '',
      '台下那几个刚才嘲笑他的学生同时闭上了嘴。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('detects public payoff scenes without differentiated spectator reactions', () => {
    const checks = scanSpectatorReactionDifferentiationRisks([
      '第9章 公审台',
      '',
      '李辰把第二本账册摊开，当众反证周薄森的指控。',
      '',
      '全场瞬间震惊，所有人都倒吸一口凉气，现场一片哗然。',
      '',
      '周薄森脸色发白，事情终于真相大白。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('spectator_reaction_unified')
    expect(checks[0].label).toBe('围观反应分层')
    expect(checks[0].fix).toContain('普通人')
    expect(checks[0].fix).toContain('懂行者')
  })

  test('builds spectator reaction sync report from public payoff delivery', () => {
    const okReport = buildSpectatorReactionSyncReport(
      { title: '公审账册' },
      { id: 9, chapter_no: 9, title: '公审台' },
      {},
      [
        '李辰把第二本账册摊开，当众反证周薄森的指控。',
        '旁听席先炸开，几个刚才起哄的商户停住脚步，不敢再跟着喊。',
        '账房老吏把算盘珠拨回去，低声说：“这页墨色是三年前的。”',
        '周薄森脸色发白，按住桌角往后退了半步。',
      ].join('\n'),
    )
    const warnReport = buildSpectatorReactionSyncReport(
      { title: '公审账册' },
      { id: 9, chapter_no: 9, title: '公审台' },
      {},
      [
        '李辰把第二本账册摊开，当众反证周薄森的指控。',
        '全场瞬间震惊，所有人都倒吸一口凉气，现场一片哗然。',
        '周薄森脸色发白，事情终于真相大白。',
      ].join('\n'),
    )

    expect(okReport).toMatchObject({ status: 'ok', label: '围观反应 OK', missed_count: 0 })
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('spectator_reaction_unified')
    expect(warnReport.next_actions.join('；')).toContain('差异化反应')
  })

  test('detects and reports evidence payoff without prior setup', () => {
    const riskyText = [
      '第10章 公审台',
      '',
      '李辰站在台前，灯光照得他脸色发白。',
      '',
      '对面的人冷笑着催他认输，台下也有人跟着起哄。',
      '',
      '他突然拿出一份检测报告，当众打脸所有质疑者。',
      '',
      '真相公开后，反派脸色惨白，再也说不出话。',
    ].join('\n')
    const checks = scanPayoffSetupRisks(riskyText)
    const report = buildPayoffSetupSyncReport({ title: '公审账册' }, { id: 10, chapter_no: 10 }, {}, riskyText)

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('payoff_without_setup_3')
    expect(checks[0].fix).toContain('证据链')
    expect(report.status).toBe('warn')
    expect(report.label).toContain('爽点铺垫缺口')
    expect(report.missed.map((item: any) => item.key)).toContain('payoff_without_setup_3')
  })

  test('does not flag evidence payoff when prior clues establish the setup', () => {
    const checks = scanPayoffSetupRisks([
      '第10章 公审台',
      '',
      '李辰把手机倒扣在掌心，录音键还亮着红点。',
      '',
      '他昨晚从档案室带出的检测报告，被他压在外套里。',
      '',
      '对面的人冷笑着催他认输，台下也有人跟着起哄。',
      '',
      '他这才把检测报告摊开，当众打脸所有质疑者。',
      '',
      '真相公开后，反派脸色惨白，再也说不出话。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })
})
