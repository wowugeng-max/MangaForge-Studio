import { describe, expect, test } from 'bun:test'
import {
  scanAntagonistDownfallAgencyRisks,
  scanEvidenceChainDumpRisks,
  scanEvidenceTimeBombRisks,
  scanFaceSlapRhythmRisks,
  scanFinalEvidenceImpactRisks,
  scanProtagonistComposureRisks,
} from './face-slap-scans'

describe('face-slap and evidence-chain scan utilities', () => {
  test('detects face-slap payoff without antagonist pressure first', () => {
    const checks = scanFaceSlapRhythmRisks([
      '第10章 公审台',
      '',
      '李辰把昨晚留下的录音备份按在掌心。',
      '',
      '他走到审判桌前，把检测报告摊开。',
      '',
      '报告上的数值直接反证旧账册，所有人都知道执事栽赃失败。',
      '',
      '执事脸色惨白，再也说不出话。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('face_slap_without_antagonist_pressure')
    expect(checks[0].fix).toContain('反派')
  })

  test('does not flag evidence chains when clues and evidence are released in stages', () => {
    const checks = scanEvidenceChainDumpRisks([
      '第10章 公审台',
      '',
      '李辰把手机倒扣在掌心，录音红点还亮着。',
      '',
      '执事把旧账册摔到审判桌上，冷笑着逼他认罪。',
      '',
      '台下有人指出昨晚监控少了三分钟，执事脸上的笑僵了一下。',
      '',
      '李辰这才把检测报告推到灯下，报告编号正好对应那三分钟。',
      '',
      '最后，他亮出转账截图，执事的名字压在收款栏里。',
    ].join('\n'))

    expect(checks).toHaveLength(0)
  })

  test('detects final evidence that does not change global understanding', () => {
    const checks = scanFinalEvidenceImpactRisks([
      '第10章 公审台',
      '',
      '李辰先放出录音，证明执事昨晚改过证词。',
      '',
      '台下有人指出监控少了三分钟，执事脸上的笑僵了一下。',
      '',
      '李辰最后把检测报告推到灯下，报告显示旧账册上的墨迹确实更晚。',
      '',
      '执事脸色发白，没人再替他说话。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('final_evidence_lacks_global_impact')
    expect(checks[0].fix).toContain('全局认知')
  })

  test('detects evidence chains without protagonist-planted time-bomb proof', () => {
    const checks = scanEvidenceTimeBombRisks([
      '第10章 公审台',
      '',
      '执事把旧账册摔到审判桌上，冷笑着逼李辰认罪。',
      '',
      '李辰先放出录音，证明执事昨晚改过证词。',
      '',
      '台下有人指出监控少了三分钟，执事脸上的笑僵了一下。',
      '',
      '李辰最后亮出转账截图，收款人不是执事，而是审判长本人。',
      '',
      '公审台彻底变了性质，旧账册不再是私人栽赃，而是整个审判庭的黑幕资金链。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('evidence_time_bomb_missing')
    expect(checks[0].fix).toContain('提前')
  })

  test('detects antagonist downfall that is unrelated to protagonist action', () => {
    const checks = scanAntagonistDownfallAgencyRisks([
      '第10章 公审台',
      '',
      '执事把旧账册摔到审判桌上，冷笑着逼李辰认罪。',
      '',
      '李辰还没来得及开口，警局的人突然冲进大厅。',
      '',
      '执事当场被带走，资格被取消，所有人都知道他再也翻不了身。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('antagonist_downfall_without_protagonist_agency')
    expect(checks[0].fix).toContain('主角行动')
  })

  test('reads runtime camelCase chapterTarget face-slap context for protagonist composure scan', () => {
    const checks = scanProtagonistComposureRisks({
      chapter_target: {
        chapter_no: 12,
        title: '长案灯下',
      },
      chapterTarget: {
        summary: '江辰当众反证执事栽赃，完成公审打脸。',
        genrePositioningContract: { genreTags: ['复仇', '打脸'] },
        characterBehaviorContract: { protagonistName: '江辰' },
      },
    }, [
      '第12章 长案灯下',
      '',
      '执事把旧账册摔到长案上，冷笑着逼江辰低头。',
      '',
      '江辰猛地吼道：“你们凭什么这样对我！我明明没有碰过账册，你们都在撒谎！”',
      '',
      '他气得浑身发抖，眼眶发红，冲上去和执事争抢账册。',
      '',
      '执事仍旧靠在椅背上，只说他现在已经输了。',
    ].join('\n'))

    expect(checks).toHaveLength(1)
    expect(checks[0].key).toBe('protagonist_composure_missing')
    expect(checks[0].evidence).toContain('江辰猛地吼道')
  })
})
