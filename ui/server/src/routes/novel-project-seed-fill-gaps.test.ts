import { describe, expect, test } from 'bun:test'
import {
  buildProjectSeedFillGapsPrompt,
  extractFillGapsPatch,
  isRicherSeedValue,
  listProjectSeedGapTargets,
  mergeSeedPreferRicher,
  seedValueRichness,
} from './novel-project-seed-fill-gaps'

function richBibleContract(extra: Record<string, any> = {}) {
  return {
    quality_checks: ['检查A', '检查B', '检查C'],
    detail: '这是一份足够厚的契约内容，包含可执行检查与边界说明，避免空壳模板。',
    ...extra,
  }
}

describe('mergeSeedPreferRicher', () => {
  test('never overwrites non-empty with empty', () => {
    const existing = {
      title: '旧书名',
      synopsis: '已有完整简介，包含主角冲突与长期看点。',
      writing_bible: {
        story_power_contract: richBibleContract({ five_dims: '目标阻碍动作反馈期待' }),
      },
      chapter_outlines: [
        { chapter_no: 1, title: '雨夜入局', summary: '主角撞见第一条异常规则并付出代价' },
        { chapter_no: 2, title: '旧案回流', summary: '对手现身施压' },
      ],
    }
    const incoming = {
      title: '',
      synopsis: '',
      writing_bible: {
        story_power_contract: {},
        reader_retention_contract: richBibleContract({
          opening_hook_rule: '前300字承接上一章压力',
          ending_hook_rule: '章末留下动作压力',
        }),
      },
      chapter_outlines: [],
    }
    const merged = mergeSeedPreferRicher(existing, incoming)
    expect(merged.seed.title).toBe('旧书名')
    expect(merged.seed.synopsis).toContain('已有完整简介')
    expect(merged.seed.writing_bible.story_power_contract.five_dims).toBe('目标阻碍动作反馈期待')
    expect(merged.seed.writing_bible.reader_retention_contract.opening_hook_rule).toContain('前300字')
    expect(merged.seed.chapter_outlines).toHaveLength(2)
    expect(merged.filled.some(item => item.includes('reader_retention_contract'))).toBe(true)
  })

  test('only updates when candidate is richer', () => {
    const existing = {
      commercial_positioning: {
        reader_promise: '短',
      },
    }
    const incoming = {
      commercial_positioning: {
        reader_promise: '读者每章都能看到主角用信息差换取可见回报，并在失败边缘完成反击。',
      },
    }
    const merged = mergeSeedPreferRicher(existing, incoming)
    expect(merged.seed.commercial_positioning.reader_promise).toContain('信息差')
  })

  test('does not replace good outlines with thinner ones', () => {
    const existing = {
      volume_outlines: [
        { title: '第一卷 城中局', goal: '立住主角规则与敌人', summary: '建立边界与代价' },
        { title: '第二卷 远线', goal: '扩大地图', summary: '新势力介入' },
      ],
      chapter_outlines: Array.from({ length: 10 }, (_, index) => ({
        chapter_no: index + 1,
        title: `专属章名${index + 1}`,
        summary: `围绕主角推进冲突${index + 1}，并留下钩子`,
      })),
    }
    const incoming = {
      volume_outlines: [{ title: '卷1', goal: '升级' }],
      chapter_outlines: [{ chapter_no: 1, title: '开篇', summary: '简介' }],
    }
    const merged = mergeSeedPreferRicher(existing, incoming)
    expect(merged.seed.volume_outlines).toHaveLength(2)
    expect(merged.seed.chapter_outlines).toHaveLength(10)
  })

  test('merges characters by name and only adds missing cast', () => {
    const existing = {
      characters: [
        { name: '林澈', role_type: '主角', goal: '查明真相' },
        { name: '许照夜', role_type: '同盟', goal: '护住林澈' },
      ],
    }
    const incoming = {
      characters: [
        { name: '林澈', role_type: '主角', goal: '查明父亲失踪与星火令真相', identity: '边境学院新生' },
        { name: '沈归墟', role_type: '反派', goal: '夺令灭口' },
      ],
    }
    const merged = mergeSeedPreferRicher(existing, incoming)
    expect(merged.seed.characters).toHaveLength(3)
    expect(merged.seed.characters.find((item: any) => item.name === '林澈').identity).toBe('边境学院新生')
    expect(merged.seed.characters.find((item: any) => item.name === '许照夜').goal).toBe('护住林澈')
    expect(merged.seed.characters.some((item: any) => item.name === '沈归墟')).toBe(true)
  })
})

describe('listProjectSeedGapTargets', () => {
  test('detects missing bible contracts and cast', () => {
    const gaps = listProjectSeedGapTargets({
      title: '测试',
      genre: '都市',
      logline: '一句话',
      characters: [{ name: '甲', role_type: '主角' }],
      writing_bible: {},
    }, ['追读留存契约', '主要对手'])
    const keys = gaps.map(item => item.key)
    expect(keys).toContain('reader_retention_contract')
    expect(keys).toContain('opening_strategy_contract')
    expect(keys).toContain('characters')
    expect(keys).toContain('antagonist')
  })
})

describe('buildProjectSeedFillGapsPrompt', () => {
  test('asks only for gaps and forbids overwriting outlines', () => {
    const prompt = buildProjectSeedFillGapsPrompt({
      seed: {
        title: '星火令',
        genre: '都市',
        characters: [{ name: '林澈' }],
        chapter_outlines: [{ chapter_no: 1, title: '失效令牌', summary: '入局' }],
        writing_bible: {},
      },
      idea: '都市悬疑升级',
      risks: ['追读留存契约', '开篇策略契约', '主要对手'],
    })
    expect(prompt).toContain('只补齐')
    expect(prompt).toContain('不得改写 chapter_outlines')
    expect(prompt).toContain('追读留存契约')
    expect(prompt).toContain('开篇策略契约')
    expect(prompt).toContain('主要对手')
    expect(prompt).toContain('星火令')
  })
})

describe('extractFillGapsPatch', () => {
  test('reads nested patch payloads', () => {
    const patch = extractFillGapsPatch({
      patch: {
        writing_bible: {
          opening_strategy_contract: richBibleContract({ hook_type: '事件噱头' }),
        },
      },
    })
    expect(patch.writing_bible.opening_strategy_contract.hook_type).toBe('事件噱头')
  })
})

describe('richness helpers', () => {
  test('placeholder loses to substantive text', () => {
    expect(isRicherSeedValue('前300字承接上一章压力并立即给新压迫', '待补')).toBe(true)
    expect(isRicherSeedValue('', '已有内容')).toBe(false)
    expect(seedValueRichness({ a: '很长很长很长很长很长很长很长很长的内容' })).toBeGreaterThan(seedValueRichness({ a: '短' }))
  })
})


describe('extractFillGapsPatch robustness', () => {
  test('parses string JSON and agent-like wrappers', () => {
    const patch = {
      writing_bible: {
        reader_retention_contract: {
          opening_hook_rule: '前300字承接上一章压力并给新压迫',
          ending_hook_rule: '章末留下动作压力',
          quality_checks: ['a', 'b'],
        },
      },
    }
    expect(extractFillGapsPatch(JSON.stringify(patch)).writing_bible.reader_retention_contract.opening_hook_rule).toContain('前300字')
    expect(extractFillGapsPatch({ output: JSON.stringify(patch) }).writing_bible.reader_retention_contract.opening_hook_rule).toContain('前300字')
    expect(extractFillGapsPatch({ content: '```json\n' + JSON.stringify(patch) + '\n```' }).writing_bible.reader_retention_contract.opening_hook_rule).toContain('前300字')
    expect(extractFillGapsPatch({ output: {}, content: JSON.stringify(patch) }).writing_bible.reader_retention_contract.opening_hook_rule).toContain('前300字')
  })
})

