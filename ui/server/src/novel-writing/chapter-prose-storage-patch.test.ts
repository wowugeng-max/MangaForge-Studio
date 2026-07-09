import { describe, expect, test } from 'bun:test'
import {
  buildChapterProseStoragePatch,
  resolveChapterProseVersionSource,
} from './chapter-prose-storage-patch'

describe('chapter prose storage patch builders', () => {
  test('builds the shared draft storage patch without post-draft director fields', () => {
    const patch = buildChapterProseStoragePatch({
      chapter: { raw_payload: { existing: true } },
      generatedTitlePatch: { title: '第二章 新门槛' },
      finalText: '正文内容',
      finalContinuityNotes: ['时间线：雨夜'],
      finalSceneBreakdown: [{ scene_no: 1, title: '门口' }],
      ohStoryDeliveryReceipts: {
        chapter_blueprint: { hook: '门槛白线' },
        scene_card_receipts: [{ scene_no: 1, delivered: true }],
        delivery_risk_receipts: [{ delivered: true }],
        revision_receipts: [{ label: '修订' }],
        deslop_repair_receipts: [{ label: '去AI味' }],
        quality_audit_repair_receipts: [{ label: '质量诊断' }],
        artifact_protocol_receipts: [{ label: '协议' }],
        pre_draft_execution_receipts: { intent_confirmation_checks: [] },
      },
    })

    expect(patch).toEqual({
      title: '第二章 新门槛',
      chapter_text: '正文内容',
      continuity_notes: ['时间线：雨夜'],
      raw_payload: {
        existing: true,
        generated_scene_breakdown: [{ scene_no: 1, title: '门口' }],
        oh_story_delivery_receipts: {
          chapter_blueprint: { hook: '门槛白线' },
          scene_card_receipts: [{ scene_no: 1, delivered: true }],
          delivery_risk_receipts: [{ delivered: true }],
          revision_receipts: [{ label: '修订' }],
          deslop_repair_receipts: [{ label: '去AI味' }],
          quality_audit_repair_receipts: [{ label: '质量诊断' }],
          artifact_protocol_receipts: [{ label: '协议' }],
          pre_draft_execution_receipts: { intent_confirmation_checks: [] },
        },
        chapter_blueprint: { hook: '门槛白线' },
        scene_card_receipts: [{ scene_no: 1, delivered: true }],
        delivery_risk_receipts: [{ delivered: true }],
        revision_receipts: [{ label: '修订' }],
        deslop_repair_receipts: [{ label: '去AI味' }],
        quality_audit_repair_receipts: [{ label: '质量诊断' }],
        artifact_protocol_receipts: [{ label: '协议' }],
        pre_draft_execution_receipts: { intent_confirmation_checks: [] },
      },
      status: 'draft',
    })
    expect(patch.raw_payload).not.toHaveProperty('oh_story_director')
    expect(patch.raw_payload).not.toHaveProperty('ohStoryDirector')
  })

  test('restores paragraph breaks before storing long single-line prose', () => {
    const singleLineProse = [
      '皮肉被烙铁烫焦的声音在残破的药铺里回荡，伴随着人体组织碳化的焦糊味。',
      '老陈的胸腔剧烈起伏，干瘪的肋骨在江哲的掌心下发出不堪重负的咯吱声。',
      '他胸口那些新生的黑色符文，此刻正疯狂地往他皮肉深处钻去。',
      '每一道符文的蠕动，都带起一缕惨绿色的毒雾，那是因果律反噬的具象化。',
      '这些符文在惨绿色的浓雾中剧烈起伏，与江哲骨骼深处的某种力量产生共振，扯得江哲皮下血管根根暴起。',
      '江哲右手五指猛地收拢。',
      '他体内的完美超人基因在这一刻疯狂律动，滚烫、纯净且不含任何灵能杂质的气血顺着掌心，强行灌入了老陈那具几乎要被冻结的残躯。',
      '没有花哨的法术，没有规则的博弈，只有纯粹到极致的物理压迫。',
      '那些黑色符文在接触到这股唯物伟力的刹那，如同遇到烈火的毒蛇，发出刺耳的爆裂声。',
      '老陈瘫软在断裂的木柱旁，满是血污的手死死抠着地面的碎石，大口大口地喘着粗气。',
      '他抬起头，那双浑浊的眼睛里写满了惊惧，死死盯着江哲。',
      '江哲没有解释，只是看了一眼老陈心口那团墨斑，声音冷硬。',
      '“符文锁死了。我只是用外力暂时压住了它。”',
      '老陈惨笑着摇了摇头。',
      '江哲转身望向药铺深处，那里传来第二声木门响动。',
    ].join('').repeat(2)

    const patch = buildChapterProseStoragePatch({
      chapter: { raw_payload: null },
      generatedTitlePatch: {},
      finalText: singleLineProse,
      finalContinuityNotes: [],
      finalSceneBreakdown: [],
      ohStoryDeliveryReceipts: {},
    })

    const storedLines = String(patch.chapter_text).split('\n').filter(Boolean)
    const lineLengths = storedLines.map(line => line.replace(/\s+/g, '').length)
    const sortedLineLengths = [...lineLengths].sort((a, b) => a - b)
    const medianLineLength = sortedLineLengths[Math.floor(sortedLineLengths.length / 2)]
    expect(storedLines.length).toBeGreaterThan(15)
    expect(medianLineLength).toBeLessThanOrEqual(80)
    expect(Math.max(...lineLengths)).toBeLessThanOrEqual(150)
    expect(String(patch.chapter_text)).toContain('\n\n')
    expect(storedLines.join('')).toBe(singleLineProse)
    expect(storedLines.every(line => line.trim() === line)).toBe(true)
  })

  test('keeps existing paragraph breaks untouched when prose already has lines', () => {
    const multilineProse = '第一段有动作。\n第二段有对白。\n第三段有钩子。'
    const patch = buildChapterProseStoragePatch({
      chapter: { raw_payload: null },
      generatedTitlePatch: {},
      finalText: multilineProse,
      finalContinuityNotes: [],
      finalSceneBreakdown: [],
      ohStoryDeliveryReceipts: {},
    })

    expect(patch.chapter_text).toBe(multilineProse)
  })

  test('adds post-draft director aliases only when a director is supplied', () => {
    const director = { status: 'ok', checks: ['delivery'] }
    const patch = buildChapterProseStoragePatch({
      chapter: { raw_payload: null },
      generatedTitlePatch: {},
      finalText: '正文内容',
      finalContinuityNotes: [],
      finalSceneBreakdown: [],
      ohStoryDeliveryReceipts: {},
      postDraftDirector: director,
    })

    expect(patch.raw_payload.oh_story_director).toBe(director)
    expect(patch.raw_payload.ohStoryDirector).toBe(director)
  })

  test('resolves version source for draft, reviewed draft, and full repair storage', () => {
    expect(resolveChapterProseVersionSource({
      revisionEligible: false,
      editorRewrite: { edited: false },
      selfCheck: { revised: true },
    })).toBe('agent_execute')
    expect(resolveChapterProseVersionSource({
      revisionEligible: false,
      editorRewrite: { edited: true },
      selfCheck: { revised: true },
    })).toBe('editor_rewrite')
    expect(resolveChapterProseVersionSource({
      revisionEligible: true,
      editorRewrite: { edited: true },
      selfCheck: { revised: true },
    })).toBe('repair')
  })
})
