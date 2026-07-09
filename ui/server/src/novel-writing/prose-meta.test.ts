import { describe, expect, test } from 'bun:test'
import {
  buildProseMetaSyncReport,
  scanModelDegenerationRisks,
  scanProseMetaLeaks,
} from './prose-meta'

describe('prose meta and model degeneration scans', () => {
  test('allows in-world chapter references while flagging authorial meta terms', () => {
    const allowed = scanProseMetaLeaks([
      '第十六章 禁门旧档',
      '林青禾翻到《禁门录》第三章，指尖停在“夜半不得回头”那一行。',
      '她把书页推到李玄面前：“这一章不是写给弟子的，是写给守门人的。”',
    ].join('\n'))
    const warned = scanProseMetaLeaks([
      '第十六章 禁门旧档',
      '林青禾按住袖口，比第一章那三秒开火更疼。',
      '这处伏笔应该让读者明白代价。',
    ].join('\n'))

    expect(allowed).toHaveLength(0)
    expect(warned.map((item: any) => item.term)).toEqual(['第一章', '伏笔', '读者'])
    expect(warned[0]).toMatchObject({ line: 2, status: 'warn' })
  })

  test('builds prose meta sync report from deterministic prose meta leaks', () => {
    const okReport = buildProseMetaSyncReport(
      { title: '袖口旧印' },
      { id: 15, chapter_no: 15, title: '袖口旧印' },
      {},
      [
        '第十五章 袖口旧印',
        '林青禾按住袖口，那枚旧印硌着掌心。',
        '账册夹页被水洇开，露出三年前封存的半枚火漆。',
      ].join('\n'),
    )
    const warnReport = buildProseMetaSyncReport(
      { title: '袖口旧印' },
      { id: 15, chapter_no: 15, title: '袖口旧印' },
      {},
      [
        '第十五章 袖口旧印',
        '林青禾按住袖口，想起上一章那枚旧印。',
        '账册夹页里还藏着一处伏笔，读者会在这里明白代价。',
      ].join('\n'),
    )

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('正文元信息 OK')
    expect(okReport.missed_count).toBe(0)
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.term)).toEqual(['上一章', '伏笔', '读者'])
    expect(warnReport.next_actions.join('；')).toContain('角色当下能感知')
  })

  test('detects blocking and advisory model degeneration risks', () => {
    const checks = scanModelDegenerationRisks([
      '第三章 风起',
      '门外的铜铃忽然响了，所有人都停在原地。',
      '门外的铜铃忽然响了，所有人都停在原地。',
      '门外的铜铃忽然响了，所有人都停在原地。',
      '任务描述：继续生成本章正文。',
      '“这一章不是写给弟子的。”',
      '作为AI，我无法继续生成本章。',
      '门缝里只剩',
    ].join('\n'))

    expect(checks.map((item: any) => item.type)).toEqual(expect.arrayContaining([
      'repetition',
      'engineering_meta',
      'ai_self_reference',
      'truncation',
    ]))
    expect(checks.filter((item: any) => item.severity === 'blocking').map((item: any) => item.type)).toEqual(expect.arrayContaining([
      'repetition',
      'engineering_meta',
      'ai_self_reference',
      'truncation',
    ]))
    expect(checks.find((item: any) => item.evidence.includes('这一章'))?.severity).toBe('advisory')
  })
})
