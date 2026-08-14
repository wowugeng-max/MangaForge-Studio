import { describe, expect, test } from 'bun:test'
import {
  buildChapterProseStoragePatch,
  ensureWebnovelParagraphBreaks,
  normalizeHumanizePostprocessForStorage,
  normalizeProseForStorage,
  normalizeWritingSkillHumanizeForStorage,
  resolveChapterProseVersionSource,
} from './chapter-prose-storage-patch'
import { CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY } from '../novel-writing-service/generation-source/types'

function expectOnlyNewlinesInserted(source: string, result: string) {
  const sourceChars = Array.from(source)
  let sourceIndex = 0
  for (const char of result) {
    if (char === sourceChars[sourceIndex]) {
      sourceIndex += 1
      continue
    }
    expect(char).toBe('\n')
  }
  expect(sourceIndex).toBe(sourceChars.length)
}

describe('chapter prose storage patch builders', () => {
  const singleNewlineDraftRows = Array.from(
    { length: 12 },
    (_, index) => `第${index + 1}段继续推进情节。`,
  )

  test('converts abnormal single-newline drafts without inventing a terminal newline', () => {
    const source = singleNewlineDraftRows.join('\r')

    expect(ensureWebnovelParagraphBreaks(source)).toBe(singleNewlineDraftRows.join('\n\n'))
  })

  test('converts abnormal single-newline drafts while preserving an existing terminal newline', () => {
    const source = `${singleNewlineDraftRows.join('\r\n')}\r\n`

    expect(ensureWebnovelParagraphBreaks(source)).toBe(`${singleNewlineDraftRows.join('\n\n')}\n`)
  })

  test('stores new task provenance under chapter_generation_source and removes stale legacy provenance', () => {
    const staleLegacyProvenance = {
      receipt_authority: 'mcp_generation_source_v1',
      binding_fingerprint: `sha256:${'1'.repeat(64)}`,
    }
    const chapterProvenance = {
      receipt_authority: CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY,
      task_id: 'task-authoritative-1',
      project_id: 1,
      chapter_id: 10,
      source: 'model',
      source_fingerprint: `sha256:${'2'.repeat(64)}`,
      context_version: `sha256:${'3'.repeat(64)}`,
      model_id: 217,
    }

    const patch = buildChapterProseStoragePatch({
      chapter: {
        raw_payload: {
          existing: true,
          prose_generation_source: staleLegacyProvenance,
        },
      },
      generatedTitlePatch: {},
      finalText: '正文内容。',
      finalContinuityNotes: [],
      finalSceneBreakdown: [],
      ohStoryDeliveryReceipts: {},
      generationSourceProvenance: chapterProvenance,
    })

    expect(patch.raw_payload.chapter_generation_source).toEqual(chapterProvenance)
    expect(patch.raw_payload).not.toHaveProperty('prose_generation_source')
    expect(patch.raw_payload.existing).toBe(true)
  })

  test('keeps historical legacy provenance under prose_generation_source', () => {
    const legacyProvenance = {
      receipt_authority: 'mcp_generation_source_v1',
      binding_fingerprint: `sha256:${'4'.repeat(64)}`,
    }

    const patch = buildChapterProseStoragePatch({
      chapter: { raw_payload: {} },
      generatedTitlePatch: {},
      finalText: '历史正文。',
      finalContinuityNotes: [],
      finalSceneBreakdown: [],
      ohStoryDeliveryReceipts: {},
      generationSourceProvenance: legacyProvenance,
    })

    expect(patch.raw_payload.prose_generation_source).toEqual(legacyProvenance)
    expect(patch.raw_payload).not.toHaveProperty('chapter_generation_source')
  })

  test('accepts and preserves historical pre-quality humanize provenance', () => {
    const normalized = normalizeHumanizePostprocessForStorage({
      accepted: true,
      candidate_provenance: {
        scope: 'pre_quality',
        stage: 'pre_quality',
        humanize_input_hash: 'a'.repeat(64),
        humanize_output_hash: 'b'.repeat(64),
        final_candidate_hash: 'c'.repeat(64),
        superseded_by_quality_revision: true,
      },
    })

    expect(normalized?.candidate_provenance).toEqual({
      scope: 'pre_quality',
      stage: 'pre_quality',
      humanize_input_hash: 'a'.repeat(64),
      humanize_output_hash: 'b'.repeat(64),
      final_candidate_hash: 'c'.repeat(64),
      superseded_by_quality_revision: true,
    })
  })

  test('accepts and preserves canonical post-quality humanize provenance', () => {
    const normalized = normalizeHumanizePostprocessForStorage({
      accepted: true,
      candidate_provenance: {
        scope: 'post_quality',
        stage: 'post_quality',
        humanize_input_hash: 'd'.repeat(64),
        humanize_output_hash: 'e'.repeat(64),
        final_candidate_hash: 'f'.repeat(64),
        superseded_by_quality_revision: false,
      },
    })

    expect(normalized?.candidate_provenance).toEqual({
      scope: 'post_quality',
      stage: 'post_quality',
      humanize_input_hash: 'd'.repeat(64),
      humanize_output_hash: 'e'.repeat(64),
      final_candidate_hash: 'f'.repeat(64),
      superseded_by_quality_revision: false,
    })
  })

  test('rejects mismatched humanize provenance scope and stage pairs', () => {
    const common = {
      humanize_input_hash: 'a'.repeat(64),
      humanize_output_hash: 'b'.repeat(64),
      final_candidate_hash: 'c'.repeat(64),
      superseded_by_quality_revision: false,
    }

    for (const candidateProvenance of [
      { ...common, scope: 'pre_quality', stage: 'post_quality' },
      { ...common, scope: 'post_quality', stage: 'pre_quality' },
    ]) {
      const normalized = normalizeHumanizePostprocessForStorage({
        accepted: true,
        candidate_provenance: candidateProvenance,
      })

      expect(normalized).not.toHaveProperty('candidate_provenance')
    }
  })

  test('stores only a bounded JSON-safe allowlist from humanize reports', () => {
    const providerUrl = 'https://provider.example/v1/humanize?api_key=SECRET_QUERY'
    const cycle: any = { label: 'cycle' }
    cycle.self = cycle
    const humanizePostprocess: any = {
      version: 'humanize_postprocess_v4',
      enabled: true,
      accepted: false,
      error: `humanize unavailable ${providerUrl} Authorization: Bearer SECRET_BEARER`,
      candidate_provenance: {
        scope: 'pre_quality',
        stage: 'pre_quality',
        humanize_input_hash: 'a'.repeat(64),
        humanize_output_hash: 'b'.repeat(64),
        final_candidate_hash: 'c'.repeat(64),
        superseded_by_quality_revision: true,
        raw_text: 'SECRET_RAW_PROSE',
      },
      stages: Array.from({ length: 80 }, (_, index) => ({
        stage: `risk_window_${index}`,
        reason: `Bearer SECRET_STAGE_${index}`,
        windows: Array.from({ length: 80 }, (__, windowIndex) => ({
          id: `window-${windowIndex}`,
          score: windowIndex,
          reasons: [`api_key=SECRET_WINDOW_${windowIndex}`],
          chars: 20,
          raw_text: 'SECRET_WINDOW_RAW',
        })),
        raw: cycle,
        callback: () => 'SECRET_CALLBACK',
      })),
      raw: cycle,
      provider_payload: { authorization: 'Bearer SECRET_OBJECT' },
    }
    humanizePostprocess.self = humanizePostprocess

    const patch = buildChapterProseStoragePatch({
      chapter: { raw_payload: {} },
      generatedTitlePatch: {},
      finalText: '正文内容。',
      finalContinuityNotes: [],
      finalSceneBreakdown: [],
      ohStoryDeliveryReceipts: {},
      humanizePostprocess,
    })
    const stored = patch.raw_payload.humanize_postprocess
    const serialized = JSON.stringify(stored)

    expect(serialized).not.toContain('provider.example')
    expect(serialized).not.toContain('SECRET_')
    expect(stored.error).toContain('humanize unavailable')
    expect(stored.error.length).toBeLessThanOrEqual(240)
    expect(stored.stages.length).toBeLessThanOrEqual(64)
    expect(stored.stages[0].windows.length).toBeLessThanOrEqual(32)
    expect(stored).not.toHaveProperty('raw')
    expect(stored).not.toHaveProperty('provider_payload')
    expect(stored).not.toHaveProperty('self')
    expect(stored.stages[0]).not.toHaveProperty('raw')
    expect(stored.stages[0]).not.toHaveProperty('callback')
    expect(stored.candidate_provenance).toEqual({
      scope: 'pre_quality',
      stage: 'pre_quality',
      humanize_input_hash: 'a'.repeat(64),
      humanize_output_hash: 'b'.repeat(64),
      final_candidate_hash: 'c'.repeat(64),
      superseded_by_quality_revision: true,
    })
  })

  test('stores the writing skill humanize generation receipt', () => {
    const writingSkillHumanize = {
      version: 'writing_skill_humanize_v2',
      fiction_humanizer_mode: 'polish',
      enabled_ids: ['fiction-humanizer-zh'],
      enabled: true,
      skipped: false,
      accepted: true,
      changed: true,
      before_chars: 1200,
      after_chars: 1180,
      chunk_count: 1,
      model_id: 317,
      passes: [{
        id: 'fiction-humanizer-zh',
        mode: 'polish',
        accepted: true,
        before_chars: 1200,
        after_chars: 1180,
        chunk_count: 1,
      }],
    }

    const patch = buildChapterProseStoragePatch({
      chapter: { raw_payload: {} },
      generatedTitlePatch: {},
      finalText: '林序把门带上。',
      finalContinuityNotes: [],
      finalSceneBreakdown: [],
      ohStoryDeliveryReceipts: {},
      writingSkillHumanize,
    })

    expect(patch.raw_payload.writing_skill_humanize).toEqual(writingSkillHumanize)
  })

  test('stores only a bounded credential-safe allowlist from writing skill reports', () => {
    const credentials = {
      authorization: 'writing-skill-bearer-value',
      cookie: 'writing-skill-cookie-value',
      token: 'writing-skill-token-value',
      passToken: 'writing-skill-pass-token-value',
    }
    const sensitiveValues = Object.values(credentials)
    const ordinaryContext = 'provider retry failed after preserving chapter context'

    const patch = buildChapterProseStoragePatch({
      chapter: { raw_payload: {} },
      generatedTitlePatch: {},
      finalText: '正文内容。',
      finalContinuityNotes: [],
      finalSceneBreakdown: [],
      ohStoryDeliveryReceipts: {},
      writingSkillHumanize: {
        version: 'writing_skill_humanize_v2',
        fiction_humanizer_mode: 'polish',
        enabled_ids: ['fiction-humanizer-zh'],
        enabled: true,
        skipped: false,
        accepted: false,
        changed: false,
        reason: `${ordinaryContext} Authorization: Bearer ${credentials.authorization} ${'r'.repeat(400)}`,
        error: `Cookie: sid=${credentials.cookie} ${'e'.repeat(400)}`,
        warnings: Array.from(
          { length: 40 },
          (_, index) => `warning ${index} access_token=${credentials.token} ${'w'.repeat(400)}`,
        ),
        before_chars: 1200,
        after_chars: 1200,
        chunk_count: 1,
        passes: Array.from({ length: 20 }, (_, index) => ({
          id: `fiction-humanizer-zh-${index}`,
          mode: 'polish',
          accepted: false,
          reason: `pass ${index} token=${credentials.passToken} ${'p'.repeat(400)}`,
          before_chars: 1200,
          after_chars: 1200,
          chunk_count: 1,
          provider_payload: { authorization: credentials.authorization },
        })),
        provider_payload: { cookie: credentials.cookie },
        unknown: 'must not persist',
      },
    })
    const stored = patch.raw_payload.writing_skill_humanize
    const serialized = JSON.stringify(stored)
    const persistedStrings = [
      stored.version,
      stored.fiction_humanizer_mode,
      ...stored.enabled_ids,
      stored.reason,
      stored.error,
      ...stored.warnings,
      ...stored.passes.flatMap((pass: any) => [pass.id, pass.mode, pass.reason]),
    ].filter((value): value is string => typeof value === 'string')

    expect(sensitiveValues.some(value => serialized.includes(value))).toBe(false)
    expect(serialized).toContain(ordinaryContext)
    expect(persistedStrings.every(value => value.length <= 240)).toBe(true)
    expect(stored.warnings.length).toBeLessThanOrEqual(32)
    expect(stored.passes.length).toBeLessThanOrEqual(16)
    expect(stored).not.toHaveProperty('provider_payload')
    expect(stored).not.toHaveProperty('unknown')
    expect(stored.passes[0]).not.toHaveProperty('provider_payload')
  })

  test('redacts credential headers, cookies, and credential key values in allowed report strings', () => {
    const credentials = {
      basic: 'dXNlcjpwYXNzd29yZA==',
      proxyBasic: 'cHJveHk6cGFzc3dvcmQ=',
      cookie: 'cookie-session-value',
      setCookie: 'set-cookie-value',
      clientSecret: 'client-secret-value',
      password: 'password-value',
      session: 'session-value',
      access: 'access-token-value',
      refresh: 'refresh-token-value',
    }
    const sensitiveValues = Object.values(credentials)
    const patch = buildChapterProseStoragePatch({
      chapter: { raw_payload: {} },
      generatedTitlePatch: {},
      finalText: '正文内容。',
      finalContinuityNotes: [],
      finalSceneBreakdown: [],
      ohStoryDeliveryReceipts: {},
      humanizePostprocess: {
        version: 'humanize_postprocess_v4',
        enabled: true,
        accepted: false,
        error: [
          'ordinary secret remains context',
          `Authorization: Basic ${credentials.basic}`,
          `Cookie: sid=${credentials.cookie}`,
          `client_secret=${credentials.clientSecret}`,
          `password=${credentials.password}`,
          `session_id=${credentials.session}`,
          `access_token=${credentials.access}`,
          `refresh_token=${credentials.refresh}`,
        ].join('\n'),
        stages: [
          { stage: 'proxy_failure', reason: `Proxy-Authorization: Basic ${credentials.proxyBasic}` },
          { stage: 'cookie_failure', reason: `Set-Cookie: sid=${credentials.setCookie}` },
          { stage: 'client_failure', reason: `client-secret=${credentials.clientSecret}` },
          { stage: 'password_failure', reason: `password=${credentials.password}` },
          { stage: 'session_failure', reason: `session=${credentials.session}` },
          { stage: 'access_failure', reason: `access-token=${credentials.access}` },
          { stage: 'refresh_failure', reason: `refresh_token=${credentials.refresh}` },
        ],
      },
    })
    const serialized = JSON.stringify(patch.raw_payload.humanize_postprocess)

    expect(sensitiveValues.some(value => serialized.includes(value))).toBe(false)
    expect(serialized.includes('ordinary secret remains context')).toBe(true)
    expect(patch.raw_payload.humanize_postprocess.error.length).toBeLessThanOrEqual(240)
    expect(patch.raw_payload.humanize_postprocess.stages[0].reason.length).toBeLessThanOrEqual(240)
  })

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

    expect(patch).toMatchObject({
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
        outgoing_handoff: {
          version: 'chapter_outgoing_handoff_v1',
          unresolved_action: '正文内容',
        },
      },
      status: 'draft',
    })
    expect(patch.raw_payload).not.toHaveProperty('oh_story_director')
    expect(patch.raw_payload).not.toHaveProperty('ohStoryDirector')
    expect(patch.raw_payload.outgoingHandoff).toEqual(patch.raw_payload.outgoing_handoff)
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
    expectOnlyNewlinesInserted(source, normalized)
  })

  test('keeps dialogue attribution and continued dialogue in one indivisible turn', () => {
    const dialogueTurn = '“别动。”他说，“门后那东西正在学你的呼吸。等它停下来，我们再进去。”'
    const source = [
      '安全门忽然向里凹下一块，门框上的铁锈簌簌落在积水里，荡开的波纹一圈追着一圈。',
      dialogueTurn,
      '江哲停住伸向门把的手，另一只手按住胸前的黑色薄片，薄片正随着门后的动静发热。',
      '楼梯下方传来鞋底蹭过水泥地的声音，先是一双脚，随后又多出第二双和第三双。',
      '老陈没有回头，只把短刀反握在腕后，用刀柄轻轻碰了碰江哲的手肘。',
      '门后的呼吸声果然停了，楼梯里的脚步也在同一刻消失，整层楼骤然安静下来。',
    ].join('')

    const normalized = normalizeProseForStorage(source)

    expect(normalized).not.toBe(source)
    expect(normalized).toContain(dialogueTurn)
    expect(normalized).not.toContain('“别动。”\n\n他说')
    expect(normalized).not.toContain('他说，\n\n“门后')
    expectOnlyNewlinesInserted(source, normalized)
  })

  test('never inserts a paragraph break inside Chinese single quotes', () => {
    const quotedThought = '他记得纸条上只有一句话：‘不要回头。听见有人喊名字也别答应。一直走到灯亮起来。’'
    const source = [
      '走廊尽头的灯依次熄灭，黑暗像潮水一样沿着地砖朝江哲脚下漫过来。',
      quotedThought,
      '身后的脚步声停在三米之外，来人没有靠近，却用老陈的声音准确叫出了他的名字。',
      '江哲盯着前方最后一盏绿灯，双手垂在身侧，步幅和呼吸都没有发生变化。',
      '那道声音又叫了一遍，这次贴得更近，温热气息几乎已经扫到他的后颈。',
      '绿灯终于亮起时，他一步跨进门内，反手将追来的黑影和声音一同关在外面。',
    ].join('')

    const normalized = normalizeProseForStorage(source)

    expect(normalized).not.toBe(source)
    expect(normalized).toContain(quotedThought)
    expectOnlyNewlinesInserted(source, normalized)
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
    expectOnlyNewlinesInserted(source, normalized)
  })

  test('only inserts newlines into the exact source character sequence and is idempotent', () => {
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
    expectOnlyNewlinesInserted(source, once)
    expect(twice).toBe(once)
  })

  test('restores paragraphs without rejecting emoji or CJK extension code points', () => {
    const source = [
      '警报灯在头顶连闪三次，控制台随即跳出一个燃烧的标记🔥，把整面玻璃映成暗红色。',
      '江哲记得这个符号只在旧档案里出现过，旁边标着一个生僻编号𠀀，代表设施最深处的封锁层。',
      '老陈拔掉通讯器的电池，顺手将门边的机械锁扣死，免得指挥室远程改写他们的通行权限。',
      '通风管里传来连续敲击声，每隔五秒重复一轮，节奏和控制台上闪烁的倒计时完全一致。',
      '江哲抄下最后三组数字，发现它们拼出的不是坐标，而是下一道安全门的开启顺序。',
      '倒计时归零之前，两人必须穿过前方四个隔离区，否则整条地下通道都会被高温蒸汽灌满。',
    ].join('')

    const once = normalizeProseForStorage(source)
    const twice = normalizeProseForStorage(once)

    expect(once).not.toBe(source)
    expect(once).toContain('\n\n')
    expect(once).toContain('🔥')
    expect(once).toContain('𠀀')
    expectOnlyNewlinesInserted(source, once)
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

  test('keeps an ambiguous unbracketed title line intact instead of splitting inside the title', () => {
    const body = [
      '沈砚贴着地下通道的墙向前挪。',
      '老陈守住身后的门。',
      '铁链声越来越近。',
      '暗金绢册忽然发热。',
      '两人同时停下。',
    ].join('').repeat(20)
    const source = `第十一章 铁链声${body}`

    const normalized = normalizeProseForStorage(source)

    expect(normalized).toBe(source)
  })

  test('protects the complete bracketed title before restoring body paragraphs', () => {
    const body = [
      '沈砚贴着地下通道的墙向前挪。',
      '老陈守住身后的门。',
      '铁链声越来越近。',
      '暗金绢册忽然发热。',
      '两人同时停下。',
    ].join('').repeat(20)
    const title = '第十一章《铁链声》'
    const source = `${title}${body}`

    const normalized = normalizeProseForStorage(source)

    expect(normalized).not.toBe(source)
    expect(normalized.startsWith(`${title}\n\n沈砚`)).toBe(true)
    expect(normalized).not.toContain('第十一章《\n\n铁链声》')
    expectOnlyNewlinesInserted(source, normalized)
  })

  test('never splits inside long dialogue wrapped in ASCII double quotes', () => {
    const dialogue = '"第一句话很长很长用来交代危险已经靠近。第二句话继续说明门后的怪物正在模仿呼吸。第三句话要求所有人不要回头也不要回答名字。第四句话告诉他们必须等灯亮之后才能离开。第五句话警告灯灭以前触碰门把就会死。第六句话让老陈带着名单先走。"'
    const source = `${dialogue}${[
      '沈砚贴着地下通道的墙向前挪。',
      '老陈守住身后的门。',
      '铁链声越来越近。',
      '暗金绢册忽然发热。',
      '两人同时停下。',
    ].join('').repeat(12)}`

    const normalized = normalizeProseForStorage(source)

    expect(normalized).not.toBe(source)
    expect(normalized).toContain(dialogue)
    expect(normalized).not.toContain('离开。\n\n第五句话')
    expectOnlyNewlinesInserted(source, normalized)
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

  test('persists outgoing_handoff derived from stored prose tail', () => {
    const patch = buildChapterProseStoragePatch({
      chapter: { ending_hook: '院长签下医院改制声明，金光剥离。', raw_payload: {} },
      generatedTitlePatch: {},
      finalText: '江哲手指即将触碰到权柄碎片。金色碎片内突然睁开一只冰冷巨眼，古老意志轰然降临！',
      finalContinuityNotes: [],
      finalSceneBreakdown: [],
      ohStoryDeliveryReceipts: {},
    })
    expect(patch.raw_payload.outgoing_handoff.hook_tail_divergence).toBe(true)
    expect(patch.raw_payload.outgoing_handoff.unresolved_action).toMatch(/巨眼|古老意志|碎片/)
  })

  test('persists chapter_progress_ledger with delivered beats and unresolved next', () => {
    const patch = buildChapterProseStoragePatch({
      chapter: {
        chapter_goal: '江哲倒汤反制家人。',
        chapter_summary: '倒汤逼出规则冲突。',
        conflict: '毒汤考验',
        ending_hook: '汤倒在爸爸头上。',
        raw_payload: {},
      },
      generatedTitlePatch: {},
      finalText: '江哲将整碗汤倒在爸爸头上。爸爸暴怒挥出利爪。江哲反手一记耳光。门外十点响起敲门声，邻居来借东西了。',
      finalContinuityNotes: [],
      finalSceneBreakdown: [],
      ohStoryDeliveryReceipts: {},
    })
    expect(patch.raw_payload.chapter_progress_ledger.version).toBe('chapter_progress_ledger_v1')
    expect(patch.raw_payload.chapter_progress_ledger.delivered_beats.length).toBeGreaterThan(0)
    expect(patch.raw_payload.chapterProgressLedger).toEqual(patch.raw_payload.chapter_progress_ledger)
  })

  test('keeps installed writing-skill ids as bounded strings in the persisted report', () => {
    const normalized = normalizeWritingSkillHumanizeForStorage({
      version: 'writing_skill_humanize_v2',
      enabled_ids: ['fiction-humanizer-zh', 'my-style-pack'],
      passes: [{ id: 'my-style-pack', accepted: true, before_chars: 100, after_chars: 120, chunk_count: 1 }],
    })
    expect(normalized?.enabled_ids).toEqual(['fiction-humanizer-zh', 'my-style-pack'])
    expect(normalized?.passes?.[0]).toMatchObject({ id: 'my-style-pack', accepted: true })
  })
})
