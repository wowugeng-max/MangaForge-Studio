import { describe, expect, test } from 'bun:test'
import {
  buildChapterProseStoragePatch,
  normalizeProseForStorage,
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

  test('splits only the wall paragraph in prose that already has multiple paragraphs', () => {
    const opening = '雨还在下。'
    const wall = [
      '江哲贴着废楼的承重墙往前挪，鞋底碾过碎玻璃，却没发出半点声音。',
      '楼道尽头的安全门虚掩着，门缝里透出的红光一明一灭，像有人在里面缓慢呼吸。',
      '老陈压低帽檐跟在后面，右手始终扣着腰间的短刀，左手则攥紧那张被雨水泡软的名单。',
      '名单最后一行刚添上他们两个人的名字，墨迹还在纸面上缓慢扩散。',
      '头顶忽然传来铁链拖动的响声，两人同时停住，谁也没有抬头。',
      '江哲抬起两根手指，示意老陈守住楼梯口，自己则朝安全门迈出一步。',
    ].join('')
    const ending = '门后有人笑了一声。'
    const source = [opening, wall, ending].join('\n\n')

    const normalized = normalizeProseForStorage(source)

    expect(normalized.startsWith(`${opening}\n\n`)).toBe(true)
    expect(normalized.endsWith(`\n\n${ending}`)).toBe(true)
    expect(normalized).not.toContain(wall)
    expect(normalized.replace(/\s+/g, '')).toBe(source.replace(/\s+/g, ''))
  })

  test('never splits inside attributed dialogue quotes', () => {
    const attributedDialogue = '老陈说：“门后不是人。你听见的脚步，是它在学我们走路。无论看见谁，都别先喊名字。”'
    const source = [
      '江哲把手掌按在安全门上，金属门板传来的震动一阵紧过一阵。',
      attributedDialogue,
      '他说完便退到楼梯阴影里，短刀横在胸前，刀尖稳稳指着那道不断扩大的门缝。',
      '门里的红光骤然熄灭，整层楼只剩雨水敲击破窗的密响。',
      '江哲没有回头，屈指在门板上敲了三下，里面也跟着响了三下。',
      '第三下落定后，门轴深处传来一声闷响，像是某种沉重的东西终于松开了手。',
    ].join('')

    const normalized = normalizeProseForStorage(source)

    expect(normalized).not.toBe(source)
    expect(normalized).toContain(attributedDialogue)
    expect(normalized.replace(/\s+/g, '')).toBe(source.replace(/\s+/g, ''))
  })

  test('places complete dialogue turns from different speakers in separate paragraphs', () => {
    const firstDialogue = '“你守楼梯，我进去。”'
    const secondDialogue = '“三分钟。超过三分钟，我就炸门。”'
    const source = [
      '安全门后的撞击突然停了，江哲和老陈隔着一层铁皮，同时听见门锁自行转动的咔哒声。',
      firstDialogue,
      secondDialogue,
      '老陈把名单塞进贴身口袋，又从背包里摸出两枚磁吸炸药，一左一右贴在门框上。',
      '江哲等红灯第三次亮起，猛地拉开安全门，腥冷的风裹着纸灰扑到两人脸上。',
      '门后的值班室空无一人，桌面却并排摆着两杯还在冒热气的茶，杯沿各压着一张照片。',
      '照片上的人正是他们，只是拍摄角度来自此刻紧闭的电梯轿厢。',
    ].join('')

    const normalized = normalizeProseForStorage(source)

    expect(normalized).toContain(`\n\n${firstDialogue}\n\n${secondDialogue}\n\n`)
    expect(normalized.replace(/\s+/g, '')).toBe(source.replace(/\s+/g, ''))
  })

  test('preserves every non-whitespace character and is idempotent', () => {
    const source = [
      '走廊里的应急灯只剩最后一盏，暗红光线把两人的影子钉在布满水渍的墙面上。',
      '江哲沿着墙根找到三枚新鲜脚印，脚印只朝安全门延伸，却没有任何返回的痕迹。',
      '他用指节碰了碰最深的一枚，积水立刻冒出细密气泡，一股腐甜气味贴着地面散开。',
      '老陈捂住口鼻退了半步，短刀却向前递出，恰好封住门缝里探出的黑色细线。',
      '细线触到刀锋便缩了回去，门后随即响起孩童数数的声音，从十开始一声声往下减。',
      '数到三时，安全门上的观察窗突然亮起一只眼睛，瞳孔里倒映着他们身后的楼梯。',
    ].join('')

    const once = normalizeProseForStorage(source)
    const twice = normalizeProseForStorage(once)

    expect(once).not.toBe(source)
    expect(once.replace(/\s+/g, '')).toBe(source.replace(/\s+/g, ''))
    expect(twice).toBe(once)
  })

  test('keeps short paragraphs, poetic short lines, chapter titles, and list rows unchanged', () => {
    const source = [
      '第十二章 门后的人',
      '',
      '雨落。',
      '灯灭。',
      '他没有回头。',
      '',
      '- 本章线索：湿脚印',
      '1. 安全门仍然锁着',
    ].join('\n')

    expect(normalizeProseForStorage(source)).toBe(source)
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

  test('stores prose admission under snake-case and camel-case aliases without disturbing raw payload fields', () => {
    const proseAdmission = {
      status: 'accepted_with_warnings' as const,
      quality_score: null,
      quality_warnings: [{ code: 'quality_below_preference' }],
      story_state_status: 'pending' as const,
      story_state_warning: { code: 'story_state_pending' },
    }
    const input = {
      chapter: {
        raw_payload: {
          existing: true,
          prose_admission: { status: 'accepted' },
          proseAdmission: { status: 'accepted' },
        },
      },
      generatedTitlePatch: {},
      finalText: '正文内容',
      finalContinuityNotes: [],
      finalSceneBreakdown: [],
      ohStoryDeliveryReceipts: {},
      proseAdmission,
    }
    const inputBefore = structuredClone(input)
    const patch = buildChapterProseStoragePatch(input)

    expect(patch.raw_payload.existing).toBe(true)
    expect(patch.raw_payload.prose_admission).toEqual(proseAdmission)
    expect(patch.raw_payload.proseAdmission).toEqual(proseAdmission)
    expect(input).toEqual(inputBefore)
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
