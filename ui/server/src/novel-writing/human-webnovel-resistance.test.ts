import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import * as workspaceModule from '../workspace'
import {
  assessResistanceRevisionAcceptance,
  buildHumanWebnovelResistancePromptDirectives,
  buildResistanceAdmissionHardFailures,
  isStoreBlockingPureAiResistanceKey,
  evaluateHumanWebnovelResistance,
  scanNarrativeHardContractRisks,
  scoreNarrativeHardContract,
  repairOverUniformParagraphShape,
  selectFingerprintSafeProse,
  selectFingerprintAdvisoryProse,
  sanitizeR58ZhuqueKillers,
  sanitizeR60ZhuqueKillers,
  sanitizeR63ZhuqueKillers,
  sanitizeR64ZhuqueKillers,
  sanitizeR65ZhuqueKillers,
  sanitizeDetectorHostileStock,
  sanitizeMissingMidSocialMess,
  scanZhuqueGreenHumanTexture,
  sanitizeMissingZhuqueGreenTexture,
  scanMidChapterExamPipelineRisks,
  sanitizeExamPipelineInterrupt,
  scanOpeningVitalReportCascadeRisks,
  sanitizeOpeningVitalReportCascade,
  scanOpeningProcessPipelineRisks,
  sanitizeOpeningProcessPipeline,
  sanitizeOpeningLightTouch,
  sanitizeMissingPrivateNoise,
  sanitizeR66ZhuqueKillers,
  sanitizeMissingMidSocialFriction,
  sanitizeMidMonologueGreenDensity,
  scanMidMonologueGreenDensityRisks,
  repairMidSentenceBankSplices,
  sanitizeResidualPureAiHardEvidence,
  collapseExactDuplicateParagraphs,
  sanitizeOpeningProbeCascade,
  sanitizeSymmetricIsomorphism,
  scanSymmetricReadingCascadeRisks,
  scanOpeningClinicalCascadeRisks,
  scanOpeningPropInventoryRisks,
  scanPrivateNoiseDeclarationRisks,
  scanEndingMovieCadenceRisks,
  scanHumanWebnovelResistanceHard,
  scanPureAiPatternFamilies,
  scanTextureDeliveryRisks,
  scanPositiveFingerprintDelivery,
  scanSocialConflictFrictionDelivery,
} from './human-webnovel-resistance'
import {
  classifyProseAdmission,
} from './prose-admission-policy'
import { scanToxicAiPatterns } from './toxic-ai-pattern-scans'
import type { FingerprintContract } from './prose-fingerprint-lib'

// Captured before any mock.module() call touches '../workspace', so the
// mocked-active-workspace block below can restore the real module exactly.
const realWorkspaceModule = { ...workspaceModule }

const sampleContract: FingerprintContract = {
  version: 1,
  name: 'test_contract',
  built_from: [],
  target: {
    cv_para: [0.4, 0.8],
    single_sentence_para_ratio: [0.7, 0.98],
    two_sentence_para_ratio: [0.02, 0.2],
    dialogue_para_ratio: [0.08, 0.4],
    max_mid_streak_max: 8,
    template_contrast_per_1k_max: 2,
    stock_adverb_per_1k_max: 2,
    clinical_hit_per_1k_max: 0.5,
    subject_ta_opener_ratio_max: 0.4,
  },
  avoid: ['临床连击'],
  prefer: ['短对白'],
  prompt_directives: ['【测试合同】对白独立成段。'],
}

describe('human-webnovel-resistance system layer', () => {
  test('flags abstract pure-AI pattern families without chapter-specific content', () => {
    const text = [
      '他知道上报质控科只会换来长达数月的停职审查。',
      '卡片背面写着交易已确认，代价交割中。',
      '这构成了一种诡异的平行线。',
      '要想搞清楚真相，必须在天亮前拿到证据。',
      '他拉开1号袋子，又拉开2号袋子。',
      '这是他的名字缩写。',
      '表格分为三列，分别写着时间地点编号。',
      '瞳孔散大固定，对光反射消失。',
    ].join('\n\n')
    const findings = scanPureAiPatternFamilies(text)
    const keys = new Set(findings.map((f) => f.key))
    expect(keys.has('hw_procedure_manual')).toBe(true)
    expect(keys.has('hw_fate_oracle')).toBe(true)
    expect(keys.has('hw_cosmic_summary')).toBe(true)
    expect(keys.has('hw_author_mission_brief')).toBe(true)
    expect(keys.has('hw_inventory_pipeline')).toBe(true)
    expect(keys.has('hw_roster_fate')).toBe(true)
    expect(keys.has('hw_clinical_cascade_phrase')).toBe(true)
    // symmetry/parallel templates are pure-AI families (r17 red)
    const text2 = ['一模一样的流程。','三道绿色平行线在不同的屏幕上同步延伸。','平行绿线。'].join('\n\n')
    const keys2 = new Set(scanPureAiPatternFamilies(text2).map(f=>f.key))
    expect(keys2.has('hw_symmetry_pipeline') || keys2.has('hw_parallel_monitor_template')).toBe(true)
    // r19 red: multi-evidence symmetry + institutional ledger + cosmic summary
    const text3 = [
      '三种不同的凭证，包含着完全一致的结构：编号与体温。',
      '温度同样稳定在三十六度五。',
      '三份交割凭证已入账，请按编号扣减。',
      '这不是偶发病例，这是系统性事件。',
      '死亡生理学的第一条铁律：新陈代谢终止。',
      '全都是注销状态，三年前就全报了失踪。',
      '强迫自己镇定下来。',
      '三具推车一字排开。',
      '每小时一到两度不可逆地下降。',
      '极度的恐惧、困惑与巨大的无力感瞬间顶上了鼻腔。',
      '写着自己编号的纸片。',
      '平行黑白条纹与刺耳的雪花声。',
    ].join('\n\n')
    const keys3 = new Set(scanPureAiPatternFamilies(text3).map((f) => f.key))
    expect(keys3.has('hw_symmetry_pipeline')).toBe(true)
    expect(keys3.has('hw_fate_oracle')).toBe(true)
    expect(keys3.has('hw_cosmic_summary')).toBe(true)
    expect(keys3.has('hw_roster_fate')).toBe(true)
    expect(keys3.has('hw_forced_calm_label')).toBe(true)
    expect(keys3.has('hw_abstract_emotion_stack')).toBe(true)
    expect(keys3.has('hw_identity_ticket_reveal')).toBe(true)
    expect(keys3.has('hw_parallel_monitor_template')).toBe(true)
    expect(findings.every((f) => !/林序|急诊|第1章/.test(f.evidence + f.fix))).toBe(true)
  })

  test('clinical density is hard; dialogue miss is advisory under contract', () => {
    // clinical-heavy, almost no dialogue
    const text = Array.from({ length: 20 }, (_, i) => {
      if (i % 4 === 0) return '瞳孔散大固定，对光反射消失。'
      if (i % 4 === 1) return '心电图拉成直线。'
      if (i % 4 === 2) return '他站在原地，没说话。'
      return '窗外有风。'
    }).join('\n\n')
    const report = evaluateHumanWebnovelResistance(text, { contract: sampleContract })
    expect(report.hard_failures.some((f) => f.key.includes('clinical') || f.key === 'hw_clinical_cascade_phrase')).toBe(true)
    // statistical dialogue miss should not hard-block by itself if clinical already fails; advisory may exist
    const dialogueAdv = report.advisory_findings.find((f) => f.key.includes('dialogue'))
    // either advisory or pass depending on ratio; ensure no chapter-specific text
    expect(report.prompt_directives.some((d) => d.includes('系统层') || d.includes('测试合同') || d.includes('人工网文'))).toBe(true)
    expect(JSON.stringify(report).includes('带温尸体')).toBe(false)
    void dialogueAdv
  })

  test('prompt directives are universal and contract-driven', () => {
    const lines = buildHumanWebnovelResistancePromptDirectives(sampleContract)
    expect(lines.some((l) => l.includes('系统层'))).toBe(true)
    expect(lines.some((l) => l.includes('测试合同'))).toBe(true)
    expect(lines.some((l) => l.includes('开篇') || l.includes('私心'))).toBe(true)
    expect(lines.every((l) => !/NO\.00|急诊科|林序|r10|保绿段/.test(l))).toBe(true)
  })

  test('clean short dialogue object-detail sample does not trip pure-AI families', () => {
    const text = [
      '桌上的纸条边角撕开了一道细口。',
      '“你看见了？”',
      '“看见了。”',
      '他没有解释，只把纸条塞进内侧口袋，反手把门扣上。',
      '外面有人停了一下。',
      '“先别出声。”',
      '“……好。”',
    ].join('\n\n')
    const findings = scanPureAiPatternFamilies(text)
    expect(findings.filter((f) => f.status === 'fail')).toHaveLength(0)
  })
})

  test('rejects resistance revise that flattens paragraph shape to monotony', () => {
    const before = [
      '门口有人停了一下。',
      '“先别出声。”',
      '“……好。”他按住门闩，又把纸条塞回内侧口袋。',
      '如果按照常规流程上报质控科，等待他的很可能是停职审查。',
      '瞳孔散大固定，对光反射消失。',
    ].join('\n\n')
    // flattened one-sentence monotony after "revise"
    const after = Array.from({ length: 24 }, (_, i) => `他看了一眼桌面编号${i + 1}。`).join('\n\n')
    const assess = assessResistanceRevisionAcceptance(before, after, { contract: sampleContract })
    expect(assess.accepted).toBe(false)
    expect(assess.reason).toContain('回退')
  })

  test('accepts resistance revise that only removes pure-AI lecture while keeping dialogue', () => {
    const before = [
      '门口有人停了一下。',
      '“先别出声。”',
      '“……好。”',
      '他按住门闩。',
      '如果按照常规流程上报质控科，等待他的很可能是长达数月的停职审查。',
      '瞳孔散大固定，对光反射消失。',
      '他摸了摸还热的腕侧，把纸条塞进口袋。',
    ].join('\n\n')
    const after = [
      '门口有人停了一下。',
      '“先别出声。”',
      '“……好。”',
      '他按住门闩。',
      '这单交上去主任先看见的一定是他。',
      '他摸了摸还热的腕侧，把纸条塞进口袋。',
    ].join('\n\n')
    const assess = assessResistanceRevisionAcceptance(before, after, { contract: sampleContract })
    expect(assess.accepted).toBe(true)
  })

  test('surgical sanitize removes clinical cascade without flattening whole chapter', () => {
    const raw = [
      '门口有人停了一下。',
      '“先别出声。”',
      '瞳孔散大固定，对光反射消失。',
      '心电图拉成直线。',
      '他摸了摸还热的腕侧，把纸条塞进口袋。',
    ].join('\n\n')
    const cleaned = sanitizeDetectorHostileStock(raw)
    expect(cleaned).not.toContain('瞳孔散大固定')
    expect(cleaned).not.toContain('心电图拉成直线')
    expect(cleaned).toContain('“先别出声。”')
    expect(cleaned).toContain('纸条')
    const report = evaluateHumanWebnovelResistance(cleaned, { contract: sampleContract })
    expect(report.vector.clinical_hit_per_1k).toBeLessThan(1)
  })


test('surgical monotony repair restores some two-sentence dense blocks', () => {
  const raw = Array.from({ length: 30 }, (_, i) => {
    if (i % 7 === 0) return '“先别出声。”'
    return `他看了一眼桌上的编号${i + 1}。`
  }).join('\n\n')
  const cleaned = sanitizeDetectorHostileStock(raw)
  const report = evaluateHumanWebnovelResistance(cleaned, { contract: sampleContract })
  expect(report.vector.single_sentence_para_ratio).toBeLessThan(0.97)
  expect(report.vector.two_sentence_para_ratio).toBeGreaterThan(0.03)
  expect(cleaned).toContain('“先别出声。”')
  expect(repairOverUniformParagraphShape(raw)).not.toEqual(raw)
})


test('fingerprint continuity rejects polish/expand that flattens texture', () => {
  const before = [
    '门口有人停了一下。',
    '“先别出声。”',
    '“……好。”他按住门闩，又把纸条塞回内侧口袋。',
    '他不想现在就把这单写进系统。',
    '他摸了摸还热的腕侧。',
  ].join('\n\n')
  const after = Array.from({ length: 28 }, (_, i) => `他看了一眼桌面编号${i + 1}。`).join('\n\n')
  const gate = selectFingerprintSafeProse(before, after, { stage: 'meme_polish' })
  expect(gate.accepted).toBe(false)
  expect(gate.text).toBe(before)
})

test('fingerprint continuity accepts preserve-mode when risk not worse', () => {
  const before = [
    '门口有人停了一下。',
    '“先别出声。”',
    '“……好。”他按住门闩，又把纸条塞回内侧口袋。',
    '他摸了摸还热的腕侧。',
  ].join('\n\n')
  const after = before + '\n\n门外脚步又近了半步。'
  const gate = selectFingerprintSafeProse(before, after, { stage: 'word_target_expand' })
  expect(gate.accepted).toBe(true)
  expect(gate.text).toContain('门外脚步又近了半步')
})

test('selectFingerprintAdvisoryProse keeps the candidate even when assessment rejects', () => {
  const before = [
    '门口有人停了一下。',
    '“先别出声。”',
    '“……好。”他按住门闩，又把纸条塞回内侧口袋。',
    '他不想现在就把这单写进系统。',
    '他摸了摸还热的腕侧。',
  ].join('\n\n')
  const after = Array.from({ length: 28 }, (_, i) => `他看了一眼桌面编号${i + 1}。`).join('\n\n')
  const gate = selectFingerprintAdvisoryProse(before, after, { stage: 'writing_skill_humanize' })
  expect(gate.text).toBe(after)
  expect(gate.accepted).toBe(false)
  expect(String(gate.reason || '')).not.toMatch(/已回退前一版正文/)
})

test('selectFingerprintAdvisoryProse still rejects empty candidates', () => {
  const gate = selectFingerprintAdvisoryProse('有正文', '   ')
  expect(gate.text).toBe('有正文')
  expect(gate.accepted).toBe(false)
  expect(gate.reason).toBe('empty_candidate')
})


  
test('r26 pure-AI families: roster paid cost + pinyin identity reveal', () => {
  const text = [
    '那句话写得极其潦草：“名单生效，代价已付。”',
    '“LX”——正好是他姓名拼音缩写。',
  ].join('\n\n')
  const keys = new Set(scanPureAiPatternFamilies(text).map((f) => f.key))
  expect(keys.has('hw_fate_oracle') || keys.has('hw_identity_ticket_reveal')).toBe(true)
})

test('r29 pure-AI families: TV snow parallel + key cinematic + conspiracy essay', () => {
  const text = [
    '荧光屏上只有满屏密密麻麻的黑白雪花点。',
    '雪花点开始发生扭曲，形成横向延伸的平行线条。',
    '平行线闪烁了一下。',
    '黄铜钥匙牙完美地卡进了锁芯深处，死死扣进了锁孔之中。',
    '三具无名尸体被精确地投放到了他所在的抢救区。',
    '咱们是不是卷进什么套牌器官贩子的案子里了？',
  ].join('\n\n')
  const keys = new Set(scanPureAiPatternFamilies(text).map((f) => f.key))
  expect(
    keys.has('hw_parallel_monitor_template')
    || keys.has('hw_ending_suspense_template')
    || keys.has('hw_cosmic_summary')
  ).toBe(true)
  const cleaned = sanitizeDetectorHostileStock(text)
  expect(cleaned).not.toContain('完美地卡进了锁芯')
  expect(cleaned).not.toContain('器官贩子')
})

test('r28 pure-AI families: handover schedule + L.X. + door-handle cadence', () => {
  const text = [
    '那行字写着：下一次交割预定，急诊科值班医师。',
    '拼音缩写：L.X.',
    '门把手开始极其缓慢地向下凹陷。',
    '节奏极其均匀，每一步之间都间隔着整整一秒。',
  ].join('\n\n')
  const keys = new Set(scanPureAiPatternFamilies(text).map((f) => f.key))
  expect(
    keys.has('hw_fate_oracle')
    || keys.has('hw_identity_ticket_reveal')
    || keys.has('hw_ending_suspense_template')
  ).toBe(true)
})

test('r27 pure-AI families: deduction ticket + name abbrev + not-but verdict', () => {
  const text = [
    '【扣减凭证：LX-0090】',
    '这是他名字的缩写。',
    '这不是什么生理罕见病，也不是什么中毒反应。',
    '有人在用这三具尸体，完成某种结算。',
  ].join('\n\n')
  const keys = new Set(scanPureAiPatternFamilies(text).map((f) => f.key))
  expect(
    keys.has('hw_identity_ticket_reveal')
    || keys.has('hw_essay_not_but_verdict')
    || keys.has('hw_fate_oracle')
  ).toBe(true)
})

test('r23 pure-AI families: abandoned lore + rule ledger + essay verdict', () => {
    const text = [
      '那台电梯早在三年前就被板封死，属于未经定义的废弃区域。',
      '仿佛有什么重物正乘着电梯，从地下几层缓缓升上来。',
      '这不是病。',
      '这是一场交易。',
      '规则网的边缘，已经撕开了一个角。',
      '心跳停止。',
      '呼吸停止。',
      '脑死亡。',
    ].join('\n\n')
    const keys = new Set(scanPureAiPatternFamilies(text).map((f) => f.key))
    expect(keys.has('hw_abandoned_space_lore')).toBe(true)
    expect(keys.has('hw_rule_ledger_summary') || keys.has('hw_essay_not_but_verdict')).toBe(true)
  })

  test('texture delivery requires mid-chapter social mess and clean ending', () => {
    // Build long chapter so mid window (25%-82%) is meaningful.
    const open = Array.from({ length: 35 }, (_, i) => `他先看了第${i + 1}项读数，指腹在纸边停了一下。`).join('\n\n')
    const sterileMid = Array.from({ length: 45 }, (_, i) => `他继续核对手感${i + 1}，没有多话。`).join('\n\n')
    const close = Array.from({ length: 40 }, (_, i) => `他把第${i + 1}条记在心里，指腹在纸边停了一下，先不写进系统。`).join('\n\n')
    const badTail = ['这不是病。', '这是一场交易。', '规则网的边缘，已经撕开了一个角。'].join('\n\n')
    const bad = [open, sterileMid, close, badTail].join('\n\n')
    const badFindings = scanTextureDeliveryRisks(bad)
    expect(badFindings.some((f) => f.key === 'hw_missing_mid_social_mess')).toBe(true)
    expect(badFindings.some((f) => f.key === 'hw_ending_rule_ledger')).toBe(true)

    const goodMid = [
      '“这不关我们事啊，产权还没划清。”',
      '“你们先把人放这儿，我回去交差。”',
      '“绩效扣到我头上我可不认。”',
      '“……那你签还是不签？”',
      '“先别动，我核对一件东西。”',
    ].join('\n\n')
    const goodTail = '他把纸片塞进内侧口袋，反手把门扣上。'
    // place social mess in true mid window
    const good = [open, goodMid, sterileMid, close, goodTail].join('\n\n')
    const goodFindings = scanTextureDeliveryRisks(good)
    expect(goodFindings.some((f) => f.key === 'hw_missing_mid_social_mess')).toBe(false)
    expect(goodFindings.some((f) => f.key === 'hw_ending_rule_ledger')).toBe(false)
  })

  test('sanitize strips abandoned lore and rule ledger without flattening dialogue', () => {
    const raw = [
      '“先别出声。”',
      '那电梯早在三年前就被板封死了。',
      '这不是病。这是一场交易。',
      '规则网的边缘，已经撕开了一个角。',
      '他先把门扣上。',
    ].join('\n\n')
    const cleaned = sanitizeDetectorHostileStock(raw)
    expect(cleaned).toContain('“先别出声。”')
    expect(cleaned).not.toContain('这是一场交易')
    expect(cleaned).not.toContain('规则网的边缘')
  })








  test('r78 light opening only strips lecture and keeps mid body intact', () => {
    const head = [
      '凌晨两点。',
      '林序拿起外套。',
      '他先把手压上去。',
      '皮肤是暖的。',
      '不是那种刚死没多久的余温，是真的暖，像睡着的人。他手背上能感觉到，就在皮肤和皮肤接触的地方，有温度在。',
      '“接一下。”',
    ].join('\n\n')
    const midMarker = '【中段绿区标记】纸边有点湿，字迹洇开，他懒得现在交差，先别上报。'
    const mid = Array.from({ length: 20 }, (_, i) => `中段动作${i + 1}，他继续往下做。`).join('\n\n')
    const raw = [head, midMarker, mid].join('\n\n')
    const fixed = sanitizeOpeningLightTouch(raw)
    expect(fixed).not.toMatch(/不是那种刚死没多久的余温，是真的暖/)
    expect(fixed).toContain(midMarker)
    expect(fixed).toMatch(/嫌|烦|这锅|懒得|袖口/)
    // must not delete mid marker region
    expect(fixed.indexOf(midMarker)).toBeGreaterThan(20)
  })

  test('r77 opening process pipeline compresses re-exam and lecture warmth', () => {
    const pad = Array.from({ length: 25 }, (_, i) => `走廊灯还亮着第${i + 1}下，他鞋底蹭过地砖继续往前。`).join('\n\n')
    const opening = [
      '林序把听诊器挂回脖子上，顺手拿起外套。',
      '他推开帘子，鞋带松着，塑料袋攥在手里。',
      '他先把手压上去。',
      '皮肤是暖的。',
      '不是那种刚死没多久的余温，是真的暖，像睡着的人。他手背上能感觉到，就在皮肤和皮肤接触的地方，有温度在。',
      '小吴开始贴电极片。',
      '他拿额温枪按了一下。',
      '三十六点四。',
      '他听诊了十秒。',
      '没有。',
      '监护仪三条线，平的。',
      '额温枪再按一次。',
      '三十六点五。',
      '比刚才高了零点一。',
      '重新看，还是三个零。',
      '他又摸了一次脉搏。',
    ].join('\n\n')
    const raw = [opening, pad, pad, pad].join('\n\n')
    const before = scanOpeningProcessPipelineRisks(raw)
    expect(before.some((f) => f.key === 'hw_opening_process_pipeline')).toBe(true)
    const fixed = sanitizeOpeningProcessPipeline(raw)
    const after = scanOpeningProcessPipelineRisks(fixed)
    expect(after.some((f) => f.key === 'hw_opening_process_pipeline')).toBe(false)
    expect(fixed).not.toMatch(/不是那种刚死没多久的余温，是真的暖/)
    expect((fixed.match(/三十六/g) || []).length).toBeLessThanOrEqual(1)
    expect(fixed).toMatch(/先别|这锅|懒得|嫌|没说话|搁到/)
  })

  test('r76 opening vital report cascade strips heart/spo2/bp colon lines', () => {
    const pad = Array.from({ length: 20 }, (_, i) => `他走了第${i + 1}步，鞋底蹭过地砖，没急着进门。`).join('\n\n')
    const report = [
      '他先把手压上去。',
      '心率：零。',
      '血氧：没读到。',
      '血压：无。',
      '他盯着那个数字看了一会儿。',
    ].join('\n\n')
    const raw = [pad, report, pad].join('\n\n')
    const before = scanOpeningVitalReportCascadeRisks(raw)
    expect(before.some((f) => f.key === 'hw_opening_vital_report_cascade')).toBe(true)
    const fixed = sanitizeOpeningVitalReportCascade(raw)
    const after = scanOpeningVitalReportCascadeRisks(fixed)
    expect(after.some((f) => f.key === 'hw_opening_vital_report_cascade')).toBe(false)
    expect(fixed).not.toMatch(/^心率：/m)
    expect(fixed).not.toMatch(/^血氧：/m)
    expect(fixed).not.toMatch(/^血压：/m)
    expect(fixed).toMatch(/先别|这锅|纸边|悬着|私心|裤腿|录全|写死/)
  })

  test('r75 exam pipeline interrupt inserts green texture between clinical probes', () => {
    const chain = Array.from({ length: 12 }, (_, i) => {
      const probes = ['他摸了颈动脉。', '对光反射没有。', '听诊没有心音。', '额温枪显示三十六度四。', '监护仪三条线是平的。', '他再按了一次脉搏。']
      return probes[i % probes.length]
    }).join('\n\n')
    const pad = Array.from({ length: 50 }, (_, i) => `他在走廊第${i + 1}步停了一下，鞋底蹭过地砖，继续往护士站方向走。`).join('\n\n')
    const raw = [pad, chain, pad].join('\n\n')
    const before = scanMidChapterExamPipelineRisks(raw)
    expect(before.some((f) => f.key === 'hw_exam_pipeline_uninterrupted')).toBe(true)
    const fixed = sanitizeExamPipelineInterrupt(raw)
    const after = scanMidChapterExamPipelineRisks(fixed)
    expect(after.some((f) => f.key === 'hw_exam_pipeline_uninterrupted')).toBe(false)
    expect(fixed).toMatch(/没说话|先别|纸边|洇|这锅|悬着/)
  })

  test('r73b green texture: quiet micro-social + fused noise/object + incomplete read', () => {
    const open = Array.from({ length: 20 }, (_, i) => `他先看了第${i + 1}项读数，指腹在纸边停了一下，把数字抄进本子。`).join('\n\n')
    const green = [
      '旁边的人端了杯水过来，没说话，放在旁边就走了。',
      '他懒得现在交差，先别上报，钥匙在口袋里硌着手指。',
      '纸上有字，几行被水浸过，洇成一片，他看了半天只能确认半截，其他认不出来。',
    ].join('\n\n')
    const close = Array.from({ length: 20 }, (_, i) => `他把第${i + 1}条记在心里，先不写进系统。`).join('\n\n')
    const good = [open, green, close].join('\n\n')
    const goodHits = scanZhuqueGreenHumanTexture(good)
    expect(goodHits.some((f) => f.key === 'hw_missing_zhuque_green_texture')).toBe(false)

    const sterile = Array.from({ length: 80 }, (_, i) => `他核对第${i + 1}项数据，屏幕上的数字没有变化，他又往下记了一行，继续翻到下一页。`).join('\n\n')
    const bad = ['开场。', sterile, '收束。'].join('\n\n')
    const before = scanZhuqueGreenHumanTexture(bad)
    expect(before.some((f) => f.key === 'hw_missing_zhuque_green_texture')).toBe(true)
    const fixed = sanitizeMissingZhuqueGreenTexture(bad)
    const after = scanZhuqueGreenHumanTexture(fixed)
    expect(after.some((f) => f.key === 'hw_missing_zhuque_green_texture')).toBe(false)
    expect(fixed).toMatch(/没说话|端了|钥匙|认不出|看了半天|先别上报/)
  })

  test('sanitizeMissingMidSocialMess injects mid push-blame cluster without chapter tuning', () => {
    // Mirror texture-delivery length floor (≥1600 compact) without any mess dialogue.
    const sterile = Array.from({ length: 60 }, (_, i) => `他先看了第${i + 1}项读数，指腹在纸边停了一下，把数字抄进本子，再核对一次监护屏。`).join('\n\n')
    const open = '急诊夜班并不安静。\n\n他把听诊器挂回脖子。'
    const close = '窗外开始有车声。\n\n他停笔抬头。'
    const raw = [open, sterile, close].join('\n\n')
    const before = scanTextureDeliveryRisks(raw)
    expect(before.some((f) => f.key === 'hw_missing_mid_social_mess')).toBe(true)
    const fixed = sanitizeMissingMidSocialMess(raw)
    const after = scanTextureDeliveryRisks(fixed)
    expect(after.some((f) => f.key === 'hw_missing_mid_social_mess')).toBe(false)
    expect(fixed).toMatch(/责任|背锅|签字|凭什么|这锅|谁担/)
  })

  test('r24 lessons: polluted mess dialogue and bag inventory / undefined lore', () => {
    const polluted = [
      ...Array.from({ length: 40 }, (_, i) => `他先看了第${i + 1}项读数，指腹在纸边停了一下，先不急着写进系统。`),
      '他捏了捏笔帽。',
      '“这不关我们事，维保合同不覆盖那边。”',
      '“死人了？那更跟我们没关系，他趴在未定义通道口。”',
      '“绩效扣到我头上我可不认。”',
      '皮鞋鞋帮上的土和夹克领口完全一致。',
      ...Array.from({ length: 40 }, (_, i) => `他把第${i + 1}条记在心里，指腹在纸边停了一下，先不写进系统。`),
      '那是未定义区域。',
      '冰冷的横杠跳出“--”。',
      '我来核对一下名单。',
    ].join('\n\n')
    const keys = new Set(scanPureAiPatternFamilies(polluted).map((f) => f.key))
    expect(keys.has('hw_abandoned_space_lore') || keys.has('hw_rule_ledger_summary')).toBe(true)
    const texture = scanTextureDeliveryRisks(polluted)
    expect(texture.some((f) => f.key === 'hw_mess_dialogue_polluted' || f.key === 'hw_ending_rule_ledger')).toBe(true)

    const bags = [
      '他开始检查三名患者的遗物。',
      '第一袋，手机、一把黄铜钥匙、两张皱巴巴的五元零钱。',
      '第二袋，一管口红。',
      '第三袋，一张黄纸收据。',
    ].join('\n\n')
    const bagKeys = new Set(scanPureAiPatternFamilies(bags).map((f) => f.key))
    expect(bagKeys.has('hw_inventory_pipeline')).toBe(true)

    const clean = [
      ...Array.from({ length: 40 }, (_, i) => `他先看了第${i + 1}项读数，指腹在纸边停了一下，先不急着写进系统。`),
      '他嫌手套黏，又扯了一下袖口。',
      '“这不关我们事，维保合同不覆盖那边。”',
      '“你们医院凭什么不给回执？明天例会扣的就是我绩效！”',
      '“……那你签还是不签？”',
      '“先别动，我只核对一件东西。”',
      '他把纸片边角捏皱，先塞进内侧口袋。',
      ...Array.from({ length: 40 }, (_, i) => `他把第${i + 1}条记在心里，指腹在纸边停了一下，先不写进系统。`),
      '他把门扣上，没再解释。',
    ].join('\n\n')
    const cleanTexture = scanTextureDeliveryRisks(clean)
    expect(cleanTexture.some((f) => f.key === 'hw_mess_dialogue_polluted')).toBe(false)
    expect(cleanTexture.some((f) => f.key === 'hw_missing_mid_social_mess')).toBe(false)
    expect(cleanTexture.some((f) => f.key === 'hw_ending_rule_ledger')).toBe(false)
  })


  test('r25 lessons: fate roots, clinical lecture, abandoned office lore, ending suspense', () => {
    const text = [
      '规则一旦启动，就没有退出的说法。',
      '状态栏写着：待交割。',
      '交割手续就得完成。',
      '他们把体温卖了，换了资源。',
      '中毒会导致中枢神经坏死，但代谢停滞后体温会在半小时内快速下降。',
      '这不是感染，也不是中毒。',
      '被某种东西在同一瞬间抽走了所有的生命体征，却唯独留下了体温。',
      '那地方因为管道渗水而废弃了。',
      '走廊两旁贴着黄黑相间的警示带。',
      '他需要找个安静的地方，把今晚发生的一切逻辑理顺。',
      '变成了用掌心重重拍打门板的砰砰声。',
    ].join('\n\n')
    const keys = new Set(scanPureAiPatternFamilies(text).map((f) => f.key))
    expect(keys.has('hw_fate_oracle')).toBe(true)
    expect(keys.has('hw_clinical_cascade_phrase') || keys.has('hw_cosmic_summary')).toBe(true)
    expect(keys.has('hw_abandoned_space_lore')).toBe(true)
    expect(keys.has('hw_essay_not_but_verdict')).toBe(true)
    expect(keys.has('hw_ending_suspense_template')).toBe(true)
    const cleaned = sanitizeDetectorHostileStock(text)
    expect(cleaned).not.toContain('规则一旦启动')
    expect(cleaned).not.toContain('待交割')
    expect(cleaned).not.toContain('逻辑理顺')
  })

  test('system gates: multi-probe opening, repeated anomaly token, ending mechanism cluster', () => {
    // Abstract samples only — no project/chapter content.
    const opening = [
      '他先看仪表，屏幕上拉出一条死线。',
      '再对光看瞳孔，没有收缩。',
      '指腹按住脉搏点，底下没起伏。',
      '读数跳到36.5，他又换仪器确认一次。',
      '听筒贴上去还是安静。',
    ].join('')
    const mid = [
      '第一处标记仍是36.5。',
      '第二处同样36.5。',
      '第三处末尾还是36.5。',
      '三件证物结构完全相同，同样印着同一组残码。',
      '三种不同来源，却完全相同的材质与字样。',
    ].join('\n\n')
    const ending = [
      '他依次拨动第一个机关、第二个机关、第三个机关。',
      '数字对齐的一瞬间，灯猛地熄灭，通道陷入了绝对的黑暗之中。',
      '重型铁锁内部发出刺耳的金属摩擦声，横栓猛然弹开，锁扣上了。',
    ].join('\n\n')
    const filler = Array.from({ length: 40 }, (_, i) => `他捏了捏笔帽，嫌麻烦，先不写。这是第${i + 1}次确认。`).join('\n\n')
    const sample = [opening, filler, mid, filler, ending].join('\n\n')
    const report = evaluateHumanWebnovelResistance(sample, { contract: sampleContract })
    const keys = new Set(report.hard_failures.map((f) => f.key))
    expect(keys.has('hw_opening_probe_cascade') || keys.has('hw_opening_clinical_cascade')).toBe(true)
    expect(keys.has('hw_symmetric_reading_cascade') || keys.has('hw_symmetric_slip_inventory')).toBe(true)
    expect(keys.has('hw_ending_movie_cadence')).toBe(true)
    expect(JSON.stringify(report)).not.toMatch(/带温尸体|林序|急诊科第1章/)
  })

  test('residual pure-AI hard failures map into store-blocking admission failures', () => {
    // Abstract multi-probe opening + repeated anomaly token + ending mechanism cluster.
    const opening = [
      '他先看仪表，屏幕上拉出一条死线。',
      '再对光看瞳孔，没有收缩。',
      '指腹按住脉搏点，底下没起伏。',
      '读数跳到36.5，他又换仪器确认一次。',
      '听筒贴上去还是安静。',
    ].join('')
    const mid = [
      '第一处标记仍是36.5。',
      '第二处同样36.5。',
      '第三处末尾还是36.5。',
      '三件证物结构完全相同，同样印着同一组残码。',
      '三种不同来源，却完全相同的材质与字样。',
    ].join('\n\n')
    const ending = [
      '他依次拨动第一个机关、第二个机关、第三个机关。',
      '数字对齐的一瞬间，灯猛地熄灭，通道陷入了绝对的黑暗之中。',
      '重型铁锁内部发出刺耳的金属摩擦声，横栓猛然弹开，锁扣上了。',
    ].join('\n\n')
    const filler = Array.from({ length: 40 }, (_, i) => `他捏了捏笔帽，嫌麻烦，先不写。这是第${i + 1}次确认。`).join('\n\n')
    const sample = [opening, filler, mid, filler, ending].join('\n\n')

    const hard = scanHumanWebnovelResistanceHard(sample)
    expect(hard.length).toBeGreaterThan(0)

    const admissionFailures = buildResistanceAdmissionHardFailures(sample)
    expect(admissionFailures.length).toBeGreaterThan(0)
    expect(admissionFailures.every((item) => item.source === 'detector_resistance')).toBe(true)
    expect(admissionFailures.some((item) => String(item.code || '').startsWith('hw_'))).toBe(true)

    const decision = classifyProseAdmission({ hard_failures: admissionFailures })
    expect(decision.status).toBe('blocked_invalid')
    expect(decision.hard_failures[0]?.source).toBe('detector_resistance')
  })

  test('clean textured sample does not produce pure-AI detector_resistance admission hard failures', () => {
    // Mixed shape + dense positive human fingerprint (private noise / object friction / dialogue / non-ta openers).
    const clean = [
      ...Array.from({ length: 30 }, (_, i) => {
        if (i % 6 === 0) return `指腹在纸边停了一下，先不急着写进系统。第${i + 1}项读数还烫手。`
        if (i % 6 === 1) return `笔帽被咬出一道白印，锈迹蹭到指缝里。`
        if (i % 6 === 2) return `“先别写，这事说不清。”`
        if (i % 6 === 3) return `抽屉边框硌手，他嫌麻烦，先锁上一格。`
        if (i % 6 === 4) return `口袋里的线头又绕到钥匙上了。`
        return `金属盘当啷一声，漏墨把纸边染脏。先不急着上报。`
      }),
      '手套黏得发涩，袖口又被扯皱。',
      '“这不关我们事，维保合同不覆盖那边。”',
      '“你们医院凭什么不给回执？明天例会扣的就是我绩效！”',
      '“……那你签还是不签？”',
      '“先别动，我只核对一件东西。”',
      '纸片边角捏皱，先塞进内侧口袋。还是怕自己记岔。',
      ...Array.from({ length: 30 }, (_, i) => {
        if (i % 5 === 0) return `纸边起刺，先不写进系统。第${i + 1}条只记心里。`
        if (i % 5 === 1) return `“别往系统里塞这句。”`
        if (i % 5 === 2) return `钥匙发烫，锁芯涩得拧不动。`
        if (i % 5 === 3) return `嫌手套腥，又扯了一下袖口。`
        return `口袋扣紧，铁盘边框还粘着泥斑。`
      }),
      '门扣上了，没再解释。外面的人还在催。',
    ].join('\n\n')
    // Pure-AI store blockers only. Soft texture gates (social friction / private-noise spacing / bank)
    // remain revise targets and must not be treated as pure-AI admission hard failures.
    const pureAiHard = scanHumanWebnovelResistanceHard(clean)
      .filter((item) => isStoreBlockingPureAiResistanceKey(String(item?.key || '')))
    expect(pureAiHard).toEqual([])
    const admissionFailures = buildResistanceAdmissionHardFailures(clean)
      .filter((item) => !String(item?.code || '').startsWith('hw_fp_'))
    expect(admissionFailures).toEqual([])
    // Even if fingerprint soft-misses remain, pure-AI families must not silently soft-pass into store.
    const decision = classifyProseAdmission({ hard_failures: admissionFailures })
    expect(decision.status).toBe('accepted')
  })

  test('sanitize strips residual clinical lecture tokens that hard-block store', () => {
    const dirty = [
      '他先摸颈动脉。',
      '这已经是生物学死亡。',
      '标准的死亡体征摆在眼前。',
      '尸僵未形成。',
      '“先别写进系统。”',
      '他把手套扯下来。',
    ].join('\n\n')
    expect(scanPureAiPatternFamilies(dirty).some((f) => f.key === 'hw_clinical_cascade_phrase')).toBe(true)
    const cleaned = sanitizeDetectorHostileStock(dirty)
    expect(cleaned).not.toMatch(/生物学死亡|标准的死亡体征|尸僵未形成|临床死亡/)
    const residual = buildResistanceAdmissionHardFailures(cleaned)
      .filter((item) => String(item.code || '') === 'hw_clinical_cascade_phrase')
    expect(residual).toEqual([])
  })

  test('sanitize strips residual identity ticket tokens that hard-block store', () => {
    const dirty = [
      '他把纸片翻过来。',
      '上面写着拼音缩写。',
      'L.X. 正好对上。',
      '下一次交割预定。',
      '“别写进系统。”',
      '他把纸塞进内侧口袋。',
    ].join('\n\n')
    expect(scanPureAiPatternFamilies(dirty).some((f) => f.key === 'hw_identity_ticket_reveal')).toBe(true)
    const cleaned = sanitizeDetectorHostileStock(dirty)
    expect(cleaned).not.toMatch(/拼音缩写|L\.X\.|下一次交割预定/)
    const residual = buildResistanceAdmissionHardFailures(cleaned)
      .filter((item) => String(item.code || '') === 'hw_identity_ticket_reveal')
    expect(residual).toEqual([])
  })

  test('residual pure-ai evidence strip removes half-hour clinical lecture', () => {
    const dirty = [
      '他摸了摸颈侧。',
      '体温会在半小时内快速下降。',
      '绝不可能维持这种温热。',
      '“先别写进系统。”',
      '他把手套扯下来。',
    ].join('\n\n')
    expect(scanPureAiPatternFamilies(dirty).some((f) => f.key === 'hw_clinical_cascade_phrase')).toBe(true)
    const cleaned = sanitizeDetectorHostileStock(dirty)
    expect(cleaned).not.toMatch(/体温会在半小时内|半小时内快速下降|绝不可能维持/)
    const residual = buildResistanceAdmissionHardFailures(cleaned)
      .filter((item) => String(item.code || '') === 'hw_clinical_cascade_phrase')
    expect(residual).toEqual([])
  })


  test('r38 residual families: bag inventory / multi-body same death / fate settlement hard-block and sanitize', () => {
    const dirty = [
      '第一个袋子里是手表和钥匙。',
      '第二个袋子里是零钱。',
      '第三个袋子是遗物袋。',
      '三个人，全部没有心跳呼吸，全部保持着正常体温。',
      '纸角写着待结算，还有预定扣减和齿轮与蛇。',
      '“先别写进系统。”',
      '他把纸塞进内侧口袋。',
    ].join('\n\n')
    const keys = new Set(scanPureAiPatternFamilies(dirty).map((f) => f.key))
    expect(keys.has('hw_inventory_pipeline') || [...keys].some((k) => k.includes('inventory'))).toBe(true)
    expect(keys.has('hw_multi_body_same_death')).toBe(true)
    expect(keys.has('hw_fate_oracle')).toBe(true)
    const cleaned = sanitizeDetectorHostileStock(dirty)
    expect(cleaned).not.toMatch(/第一个袋子|第二个袋子|第三个袋子|遗物袋/)
    expect(cleaned).not.toMatch(/待结算|预定扣减|齿轮与蛇/)
    expect(cleaned).not.toMatch(/三个人[，,]?全部没有心跳/)
    const residual = buildResistanceAdmissionHardFailures(cleaned)
      .filter((item) => ['hw_inventory_pipeline', 'hw_multi_body_same_death', 'hw_fate_oracle'].includes(String(item.code || '')))
    expect(residual).toEqual([])
  })

  test('positive human fingerprint hard-blocks sparse private noise and high ta openers', () => {
    const sparse = Array.from({ length: 80 }, (_, i) => (
      i % 3 === 0
        ? `他检查了第${i + 1}处读数，确认没有异常波动，然后把页面往下翻了一格。`
        : `他继续核对第${i + 1}项指标，页面显示平稳，没有需要立刻处理的红点。`
    )).join('\n\n')
    const findings = scanPositiveFingerprintDelivery(sparse)
    const keys = new Set(findings.map((f) => f.key))
    expect(keys.has('hw_positive_no_private_noise') || keys.has('hw_positive_noise_gap_too_large')).toBe(true)
    expect(keys.has('hw_positive_object_friction_sparse') || keys.has('hw_positive_window_empty')).toBe(true)
    expect(findings.some((f) => f.blocking || f.status === 'fail')).toBe(true)
  })

  test('positive human fingerprint accepts dense texture sample', () => {
    const dense = [
      ...Array.from({ length: 12 }, (_, i) => `笔帽咬痕发涩，纸边起刺。先不写第${i + 1}条。`),
      '“这不关我的事，绩效别扣我头上。”',
      '“你凭什么不签字？”',
      '“……先别动那张单。”',
      '手套黏，袖口扯皱，钥匙硌手。',
      ...Array.from({ length: 12 }, (_, i) => `金属边框当啷一声，漏墨脏了第${i + 1}行。嫌麻烦，先塞回口袋。`),
      '“维保合同不覆盖这边。”',
      '“那谁背锅？”',
      '门扣上了。外面的人还在催。',
    ].join('\n\n')
    // pad to length threshold
    const long = dense + '\n\n' + Array.from({ length: 20 }, (_, i) => (
      i % 2 === 0
        ? `指腹停在纸边，先不急着上报第${i + 1}项。`
        : `“别往系统里写这句。”`
    )).join('\n\n')
    const findings = scanPositiveFingerprintDelivery(long)
    const hard = findings.filter((f) => f.blocking || f.status === 'fail')
    expect(hard).toEqual([])
  })

  test('prompt directives include positive human fingerprint delivery', () => {
    const lines = buildHumanWebnovelResistancePromptDirectives(sampleContract)
    expect(lines.some((l) => l.includes('正向人工指纹·强制交付'))).toBe(true)
    expect(lines.some((l) => l.includes('正向人工指纹·密度硬指标') || l.includes('正向人工指纹·窗口交付'))).toBe(true)
    expect(lines.every((l) => !/林序|急诊|带温尸体/.test(l))).toBe(true)
  })

  test('opening probe cascade sanitize keeps one early probe and clears cascade hard fail', () => {
    const dirty = [
      '他嫌手套黏，先不看屏幕。',
      '“先别写进系统。”',
      '指腹按住颈侧，没有搏动。',
      '听诊器贴上胸口，没有心音。',
      '屏幕上跳出三十六度五。',
      '心电图成了一条线。',
      '他把纸塞进口袋。',
    ].join('\n\n')
    expect(scanOpeningClinicalCascadeRisks(dirty).some((f) => f.key === 'hw_opening_probe_cascade')).toBe(true)
    const cleaned = sanitizeOpeningProbeCascade(dirty)
    expect(scanOpeningClinicalCascadeRisks(cleaned)).toEqual([])
    const residual = sanitizeDetectorHostileStock(dirty)
    expect(scanOpeningClinicalCascadeRisks(residual)).toEqual([])
  })

  test('symmetric isomorphism sanitize clears multi-item same-structure hard fail', () => {
    const dirty = [
      '第一张纸一模一样。',
      '第二张纸依然是同一结构。',
      '第三张纸一模一样。',
      '三种不同来源却完全相同。',
      '“先别写进系统。”',
      '他把纸塞进口袋。',
    ].join('\n\n')
    // force enough iso markers
    const text = dirty + '\n\n' + '依然是同样编号。一模一样。同样印着。'
    expect(scanSymmetricReadingCascadeRisks(text).some((f) => String(f.key).includes('symmetric'))).toBe(true)
    const cleaned = sanitizeSymmetricIsomorphism(text)
    expect(scanSymmetricReadingCascadeRisks(cleaned).filter((f) => f.key === 'hw_symmetric_slip_inventory')).toEqual([])
    const residual = sanitizeDetectorHostileStock(text)
    expect(scanSymmetricReadingCascadeRisks(residual).filter((f) => f.key === 'hw_symmetric_slip_inventory')).toEqual([])
  })

  test('positive fingerprint soft for store admission while pure-AI still hard-blocks', () => {
    const sparse = Array.from({ length: 80 }, (_, i) => (
      i % 3 === 0
        ? `他检查了第${i + 1}处读数，确认没有异常波动，然后把页面往下翻了一格。`
        : `他继续核对第${i + 1}项指标，页面显示平稳，没有需要立刻处理的红点。`
    )).join('\n\n')
    // may hard-fail positive scan, but must NOT store-block via admission pure-AI policy
    const positiveHard = scanPositiveFingerprintDelivery(sparse).filter((f) => f.blocking || f.status === 'fail')
    expect(positiveHard.length).toBeGreaterThan(0)
    const admission = buildResistanceAdmissionHardFailures(sparse)
      .filter((item) => String(item.code || '').startsWith('hw_positive_'))
    expect(admission).toEqual([])
    expect(isStoreBlockingPureAiResistanceKey('hw_positive_noise_gap_too_large')).toBe(false)
    expect(isStoreBlockingPureAiResistanceKey('hw_opening_probe_cascade')).toBe(false)
    expect(isStoreBlockingPureAiResistanceKey('hw_clinical_cascade_phrase')).toBe(true)
    expect(isStoreBlockingPureAiResistanceKey('hw_fate_oracle')).toBe(false) // Zhuque-first soft for packaging
  })

  test('opening probe cascade sanitize rotates private-noise and collapse removes exact stamp dups', () => {
    const stamp = '他先不急着写进系统，指腹在纸边停了一下。'
    const probeHeavy = [
      '林序走进抢救室。',
      '他先摸颈动脉，再听诊，屏幕显示三十六度八，心电图拉直线，瞳孔对光没有反应。',
      '他再按住手腕核对脉搏读数。',
      '红外扫描仪跳出摄氏读数。',
      '监护屏上的示波又扫过一圈。',
      '鉴定仪上的死亡体征还停着。',
      stamp,
      stamp,
      stamp,
      '小刘在门口喊他。',
    ].join('\n\n')
    const cleaned = sanitizeDetectorHostileStock(probeHeavy)
    const paras = cleaned.split(/\n+/).map((p) => p.trim()).filter(Boolean)
    const stampCount = paras.filter((p) => p === stamp).length
    expect(stampCount).toBeLessThanOrEqual(1)
    // exact narrative dups collapsed
    const collapsed = collapseExactDuplicateParagraphs([stamp, '别的动作。', stamp, stamp].join('\n\n'))
    expect(collapsed.split(/\n+/).filter((p) => p.trim() === stamp).length).toBe(1)
  })

describe('r40 zhuque system contracts', () => {
  test('flags opening prop inventory without private goal/dialog', () => {
    const opening = [
      '橡胶手套勒得手汗发黏。',
      '废纸桶里躺着半截吸剩下的烟屁股。',
      '墙上的挂钟正好走过凌晨两点十四分。',
      '急诊科大厅里的黄荧光灯管吱吱作响，空气里漂着过氧化氢与劣质消毒水混合的刺鼻味。',
      '推车轮子碾过瓷砖缝，发出连串沉闷的哐当声。',
      '平车上躺着个中年男人，穿一件湿漉漉的深灰色夹克，袖口沾着黏稠的油污。',
    ].join('\n\n')
    const hits = scanOpeningPropInventoryRisks(opening)
    expect(hits.some((h) => h.key === 'hw_opening_prop_inventory')).toBe(true)
    const cleaned = sanitizeDetectorHostileStock(opening + '\n\n他继续往里走。')
    // after sanitize, pure prop streak should reduce or gain private texture
    const after = scanOpeningPropInventoryRisks(cleaned)
    expect(after.length).toBe(0)
  })

  test('flags semi-science lecture and strips 按理说 stock', () => {
    const sample = [
      '他摸了摸颈侧。',
      '按理说这种从外头抬进来的躯体，四肢早就该凉透。',
      '一个人只要心跳停止，体温就会按照环境温度快速下降。',
      '他抬头看向门口。',
    ].join('\n\n')
    const hard = scanPureAiPatternFamilies(sample)
    expect(hard.some((h) => h.key === 'hw_semi_science_lecture')).toBe(true)
    const cleaned = sanitizeDetectorHostileStock(sample)
    expect(cleaned.includes('按理说')).toBe(false)
    expect(cleaned.includes('一个人只要')).toBe(false)
    expect(buildResistanceAdmissionHardFailures(sample).some((x) => x.code === 'hw_semi_science_lecture')).toBe(false) // Zhuque-first soft
  })

  test('flags multi-body same-test template', () => {
    const sample = '林序走到第二名患者身边。同样的测试，同样的停摆。他又走到第三名身边。'
    const hard = scanPureAiPatternFamilies(sample)
    expect(hard.some((h) => h.key === 'hw_multi_body_same_death')).toBe(true)
  })

  test('flags ending lock cadence and softens it', () => {
    const ending = [
      '他来到保管室门前。',
      '保管室厚重的铁门上挂着一把粗壮的重型挂锁，锁头上满是红褐色的铁锈。',
      '林序伸手握住重型铁锁，指尖沾上了一层干涩的锈粉。',
      '用力摇晃了一下锁扣。',
      '铁锁内部突然传来牙酸的咔哒声。',
      '重型铁锁内部发出刺耳的金属摩擦声，横栓猛然弹开，锁扣上了。',
    ].join('\n\n')
    const hits = scanEndingMovieCadenceRisks(ending)
    expect(hits.some((h) => h.key === 'hw_ending_movie_cadence')).toBe(true)
    const cleaned = sanitizeDetectorHostileStock(ending)
    expect(cleaned.includes('锁扣上了')).toBe(false)
    expect(isStoreBlockingPureAiResistanceKey('hw_ending_movie_cadence')).toBe(false)
    expect(isStoreBlockingPureAiResistanceKey('hw_opening_prop_inventory')).toBe(false)
    expect(isStoreBlockingPureAiResistanceKey('hw_private_noise_declaration')).toBe(false)
    expect(isStoreBlockingPureAiResistanceKey('hw_semi_science_lecture')).toBe(false) // Zhuque-first soft for packaging
  })

  test('flags bolted-on private-noise declarations', () => {
    const sample = [
      '他按住颈动脉。',
      '先不上报系统，省得接诊台那帮人又把台账往他头上甩。',
      '监护仪长鸣。',
      '这单子绝对不能贸然签字盖章，谁接手谁背锅。',
      '他抽出清点袋。',
    ].join('\n\n')
    const hits = scanPrivateNoiseDeclarationRisks(sample)
    expect(hits.some((h) => h.key === 'hw_private_noise_declaration')).toBe(true)
  })
})

describe('r41 residual pure-AI narrative families', () => {
  test('flags coincidence omniscience and strips it', () => {
    const sample = [
      '他把硬卡纸抽出来一点。',
      '这三个人被送到这里，不是巧合。',
      '对方知道今晚是他值班，甚至知道他会去翻找遗物。',
      '他重新把卡纸塞回口袋。',
    ].join('\n\n')
    const hard = scanPureAiPatternFamilies(sample)
    expect(hard.some((h) => h.key === 'hw_coincidence_omniscience')).toBe(true)
    const cleaned = sanitizeDetectorHostileStock(sample)
    expect(cleaned.includes('不是巧合')).toBe(false)
    expect(cleaned.includes('对方知道今晚')).toBe(false)
    expect(isStoreBlockingPureAiResistanceKey('hw_coincidence_omniscience')).toBe(false) // Zhuque-first soft for packaging
    expect(buildResistanceAdmissionHardFailures(sample).some((x) => x.code === 'hw_coincidence_omniscience')).toBe(false) // Zhuque-first soft
  })

  test('flags multi-item pocket inventory pipeline', () => {
    const sample = [
      '林序伸手摸进工装男的口袋。',
      '里面有一盒挤扁的廉价香烟，一个打火机，还有一张折叠过的收据。',
      '他转走到第二具推车旁。',
      '按照流程，无名氏的遗物必须双人清点并登记造册。',
    ].join('\n\n')
    const hard = scanPureAiPatternFamilies(sample)
    expect(hard.some((h) => h.key === 'hw_inventory_pipeline')).toBe(true)
    const cleaned = sanitizeDetectorHostileStock(sample)
    expect(cleaned.includes('打火机')).toBe(false)
    expect(cleaned.includes('第二具推车')).toBe(false)
  })

  test('flags ending procedure debate and softens it', () => {
    const sample = [
      '小刘在门口喊他。',
      '“林医生，司法鉴定中心那边回电话了，说今晚值班人员不够，要等到明晨八点才能派车来拉人。”',
      '“不用等八点。”',
      '“我现在就给他们做全面检测。”',
      '“林医生，咱们急诊科没有解剖权限啊，这违反规程！”',
      '“出了事，算我的。”',
    ].join('\n\n')
    const hard = scanPureAiPatternFamilies(sample)
    expect(hard.some((h) => h.key === 'hw_ending_procedure_debate')).toBe(true)
    const cleaned = sanitizeDetectorHostileStock(sample)
    expect(cleaned.includes('全面检测')).toBe(false)
    expect(cleaned.includes('算我的')).toBe(false)
    expect(isStoreBlockingPureAiResistanceKey('hw_ending_procedure_debate')).toBe(false) // Zhuque-first soft for packaging
  })
})

describe('r42 face-to-face social friction and profession essay', () => {
  test('flags profession worldview essay and strips it', () => {
    const sample = [
      '他把手压在拉链上。',
      '作为一名受过专业训练的急诊医生，他习惯了用科学和逻辑去解释一切临床现象。',
      '心跳停止就是生物学意义上的死亡，细胞停止代谢，体温必然下降，这是不可逆转的自然规律。',
      '可眼前的这一切，正以一种极其残酷的方式，将他二十多年建立起来的认知摧毁得粉碎。',
      '他把拉链按住。',
    ].join('\n\n')
    const hard = scanPureAiPatternFamilies(sample)
    expect(hard.some((h) => h.key === 'hw_profession_worldview_essay')).toBe(true)
    const cleaned = sanitizeDetectorHostileStock(sample)
    expect(cleaned.includes('作为一名')).toBe(false)
    expect(cleaned.includes('生物学意义上的死亡')).toBe(false)
    expect(cleaned.includes('认知摧毁')).toBe(false)
    expect(isStoreBlockingPureAiResistanceKey('hw_profession_worldview_essay')).toBe(true)
  })

  test('flags abstract link summary', () => {
    const sample = [
      '他摸出铜扣。',
      '这些东西没有任何一件能证明他们的身份。',
      '但它们却以一种诡异的方式，将这三个毫无关联的人串联在一起。',
    ].join('\n\n')
    const hard = scanPureAiPatternFamilies(sample)
    expect(hard.some((h) => h.key === 'hw_abstract_link_summary')).toBe(true)
    const cleaned = sanitizeDetectorHostileStock(sample)
    expect(cleaned.includes('串联在一起')).toBe(false)
  })

  test('flags phone-proxy mid social and accepts face-to-face friction', () => {
    const pad = (i: number) => `走廊灯管吱吱响，地砖缝里积着灰，他数到第${i}步时鞋底还在发黏，手套边也湿了一截。`
    const phoney = Array.from({ length: 48 }, (_, i) => {
      if (i === 16) return '电话突然响了起来。'
      if (i === 17) return '“急诊科吗？我是保卫处老张啊。”'
      if (i === 18) return '“刚才监控室看到，送人过来的面包车是假牌。”'
      if (i === 19) return '“你们留个心眼。”'
      if (i === 20) return '林序放下听筒。'
      if (i === 21) return '忙音嘟嘟地响着。'
      return pad(i)
    }).join('\n\n')
    const phoneHits = scanSocialConflictFrictionDelivery(phoney)
    expect(phoneHits.some((h) => h.key === 'hw_mid_phone_proxy_social' || h.key === 'hw_missing_mid_social_friction')).toBe(true)

    const face = Array.from({ length: 48 }, (_, i) => {
      if (i === 14) return '老头双脚在地上拖行，鞋尖划出两条灰痕。'
      if (i === 15) return '灰夹克男人把老头往靠墙的看诊椅上一放，转身就想往外走。'
      if (i === 16) return '林序一步跨过去，挡在门口。'
      if (i === 17) return '“站住，这人怎么回事？”'
      if (i === 18) return '“路边倒着的，我们顺路送过来。”'
      if (i === 19) return '“身份证件呢？挂号费谁垫？”'
      if (i === 20) return '“我们做好事送人过来，还要我们掏钱？凭什么啊！”'
      if (i === 21) return '灰夹克男人猛地一推，小刘撞在门框上，登记表掉在地上。'
      if (i === 22) return '两个灰夹克挤出抢救室门洞，骂着下一单来不及先跑了。'
      if (i === 23) return '小刘揉着肩膀站起来，把湿漉漉的单据捡起来。'
      return pad(i)
    }).join('\n\n')
    const faceHits = scanSocialConflictFrictionDelivery(face)
    expect(faceHits.some((h) => h.key === 'hw_missing_mid_social_friction')).toBe(false)
    expect(faceHits.some((h) => h.key === 'hw_mid_phone_proxy_social')).toBe(false)
  })
})

describe('r43 multi-turn green segment system contracts', () => {
  test('flags clinical typical label and negation cascade', () => {
    const sample = [
      '他按住颈动脉。',
      '没有起伏，没有震荡，没有哪怕一次微弱的代偿性抽搐。',
      '这是肌肉失张力的典型表现。',
      '他先不写进系统。',
    ].join('\n\n')
    const hard = scanPureAiPatternFamilies(sample)
    expect(hard.some((h) => h.key === 'hw_negation_cascade')).toBe(true)
    expect(hard.some((h) => h.key === 'hw_clinical_typical_label')).toBe(true)
    const cleaned = sanitizeDetectorHostileStock(sample)
    expect(cleaned.includes('典型表现')).toBe(false)
    expect(cleaned.includes('没有哪怕')).toBe(false)
  })

  test('flags self-name reveal and strips it', () => {
    const sample = [
      '他把纸角翻过来。',
      '文字最后的两个字，正是他自己的名字。',
      '他捏住拉链头。',
    ].join('\n\n')
    const hard = scanPureAiPatternFamilies(sample)
    expect(hard.some((h) => h.key === 'hw_self_name_reveal' || h.key === 'hw_identity_ticket_reveal')).toBe(true)
    const cleaned = sanitizeDetectorHostileStock(sample)
    expect(cleaned.includes('正是他自己的名字')).toBe(false)
    expect(isStoreBlockingPureAiResistanceKey('hw_self_name_reveal')).toBe(true)
  })

  test('requires multi-turn face-to-face social friction', () => {
    // Pad must exceed compact 1600 so the mid-window social gate actually runs.
    const pad = (i: number) => `走廊灯管吱吱响，地砖缝里积着灰，他数到第${i}步时鞋底还在发黏，手套边也湿了一截，墙角有没拧紧的水龙头滴答响。`
    // weak: only one cost line + one block action, not multi-turn
    const weak = Array.from({ length: 48 }, (_, i) => {
      if (i === 16) return '林序挡在门口。'
      if (i === 17) return '“先签字。”'
      if (i === 18) return '对方搓了搓手。'
      return pad(i)
    }).join('\n\n')
    const weakHits = scanSocialConflictFrictionDelivery(weak)
    expect(weakHits.some((h) => h.key === 'hw_missing_mid_social_friction')).toBe(true)

    // strong: quality green = multi-turn + object reading in conflict + incomplete interrupt (no drama pack)
    const strong = Array.from({ length: 48 }, (_, i) => {
      if (i === 14) return '老黄一把推开抢救室门，把交接单拍在台上。'
      if (i === 15) return '“林医生，签字！赶紧签，外面还压着两趟出车。”'
      if (i === 16) return '林序站稳在推车旁，挡住了去路。'
      if (i === 17) return '“异常体温，不能直接出死亡证明。”'
      if (i === 18) return '“你凭什么不签？耽误下一个救援，责任算谁的？”'
      if (i === 19) return '老黄脏靴子在地面上踩出一个泥印。'
      if (i === 20) return '林序把体温枪屏幕朝向老黄：“三十六度五。”'
      if (i === 21) return '“签字，或者叫值班院长过来。”'
      if (i === 22) return '老黄用力往回一扯，纸页撕开一道口子。'
      if (i === 23) return '林序手臂横在推车扶手上，直接把担架车顶在原地。'
      if (i === 24) return '“行，我找你们科主任！”'
      if (i === 25) return '分诊台广播突然刺耳地响起来，老黄骂着拉着空车先走了。'
      return pad(i)
    }).join('\n\n')
    const strongHits = scanSocialConflictFrictionDelivery(strong)
    expect(strongHits.some((h) => h.key === 'hw_missing_mid_social_friction')).toBe(false)
    expect(strongHits.some((h) => h.key === 'hw_mid_drama_packaged_conflict')).toBe(false)
  })

  test('sanitize injects dirty-body texture next to multi-turn face friction', () => {
    const pad = (i: number) => `走廊灯管吱吱响，地砖缝里积着灰，他数到第${i}步时呼吸发沉，墙角有没拧紧的水龙头滴答响，远处广播还在喊号。`
    // multi-turn + object + incomplete, but NO dirty-body tokens near conflict
    const almost = Array.from({ length: 48 }, (_, i) => {
      if (i === 14) return '老黄一把推开抢救室门，把单子按在台上。'
      if (i === 15) return '“林医生，签字！赶紧签，外面还压着两趟出车。”'
      if (i === 16) return '林序站稳在推车旁，挡住了去路。'
      if (i === 17) return '“异常体温，不能直接出死亡证明。”'
      if (i === 18) return '“你凭什么不签？耽误下一个救援，责任算谁的？”'
      if (i === 19) return '林序把体温枪屏幕朝向老黄：“三十六度五。”'
      if (i === 20) return '“签字，或者叫值班院长过来。”'
      if (i === 21) return '老黄用力往回一扯，单子还卡在手里。'
      if (i === 22) return '广播又喊下一单，门外又送来人。'
      return pad(i)
    }).join('\n\n')
    const before = scanSocialConflictFrictionDelivery(almost)
    expect(before.some((h) => h.key === 'hw_missing_mid_social_friction')).toBe(true)
    const cleaned = sanitizeDetectorHostileStock(almost)
    const after = scanSocialConflictFrictionDelivery(cleaned)
    expect(after.some((h) => h.key === 'hw_missing_mid_social_friction')).toBe(false)
    expect(sanitizeMissingMidSocialFriction(almost)).not.toEqual(almost)
  })

  test('flags drama-packaged conflict and dual exam as non-green', () => {
    const sample = [
      '他刚想仔细检查那张纸片，走廊外突然传来一阵嘈杂的脚步声，伴随着推车撞击墙壁的沉闷巨响。',
      '“赶紧签字！”老张嗓门大得像雷响。',
      '推车硬生生撞在林序膝盖上。',
      '林序手掌死死抵住扶手：“没走完程序不能往抢救室塞，扣的是我的执业医师证。”',
      '他伸出双手，同时按向两人的颈动脉。',
      '双手传来的触感，依然是温热的，令人不适。',
    ].join('\n\n')
    const hard = scanPureAiPatternFamilies(sample)
    expect(hard.some((h) => h.key === 'hw_cinematic_transition')).toBe(true)
    expect(hard.some((h) => h.key === 'hw_drama_intensifier_pack' || h.key === 'hw_procedure_debate_conflict')).toBe(true)
    expect(hard.some((h) => h.key === 'hw_dual_simultaneous_exam')).toBe(true)
    const cleaned = sanitizeDetectorHostileStock(sample)
    expect(cleaned.includes('沉闷巨响')).toBe(false)
    expect(cleaned.includes('硬生生')).toBe(false)
    expect(cleaned.includes('执业医师证')).toBe(false)
    expect(cleaned.includes('同时按向两人')).toBe(false)
    expect(isStoreBlockingPureAiResistanceKey('hw_cinematic_transition')).toBe(true)
    expect(isStoreBlockingPureAiResistanceKey('hw_dual_simultaneous_exam')).toBe(true)
  })



  test('flags pathology essay, literary body metaphor, multi-body same temp', () => {
    const sample = [
      '没有心跳，没有呼吸，没有脑干反射。',
      '桡动脉安静得像是一根冷冻过后的橡胶管，毫无回应。',
      '这根本不是任何已知临床病理能解释的状态。',
      '执拗地把体温卡在三十六度半。',
      '哔。36.5℃。',
      '第二具也是36.5℃。',
      '这是第三个。一个小时内，连续三个没有呼吸。',
      '传染病不会让心脏停止跳动的瞬间还维持精确体温。',
    ].join('\n\n')
    const hard = scanPureAiPatternFamilies(sample)
    expect(hard.some((h) => h.key === 'hw_negation_cascade' || h.key === 'hw_pathology_essay_verdict')).toBe(true)
    expect(hard.some((h) => h.key === 'hw_literary_body_metaphor' || h.key === 'hw_pathology_essay_verdict')).toBe(true)
    expect(hard.some((h) => h.key === 'hw_multi_body_same_temp_chain' || h.key === 'hw_pathology_essay_verdict')).toBe(true)
    const cleaned = sanitizeDetectorHostileStock(sample)
    expect(cleaned.includes('冷冻过后的橡胶管')).toBe(false)
    expect(cleaned.includes('已知临床病理')).toBe(false)
    expect(isStoreBlockingPureAiResistanceKey('hw_pathology_essay_verdict')).toBe(true)
    expect(isStoreBlockingPureAiResistanceKey('hw_missing_mid_social_friction')).toBe(false)
    expect(isStoreBlockingPureAiResistanceKey('hw_mid_phone_proxy_social')).toBe(false)
  })

  test('flags ledger bill reveal and ending cinematic stack', () => {
    const sample = [
      '他摸出一张纸。',
      '【城东区异常出籍与额度清算表】',
      '【状态：已交割】',
      '【余温保留时间：12小时】',
      '这是一份明码标价的账单。',
      '金属拉链头在灯光下闪着冷光。',
      '拉链缓缓向上滑行，发出拉拉的声音。',
      '扭曲的油墨字迹在无影灯下泛着微弱的荧光，像是某种刚刚盖上去的、尚未干透的鲜血印章。',
      '“瞳孔散大至少半小时以上，甲床没有复充，心电图平直。”',
    ].join('\n\n')
    const hard = scanPureAiPatternFamilies(sample)
    expect(hard.some((h) => h.key === 'hw_ledger_bill_reveal')).toBe(true)
    expect(hard.some((h) => h.key === 'hw_ending_cinematic_stack')).toBe(true)
    expect(hard.some((h) => h.key === 'hw_clinical_lecture_in_dialog')).toBe(true)
    const cleaned = sanitizeDetectorHostileStock(sample)
    expect(cleaned.includes('额度清算')).toBe(false)
    expect(cleaned.includes('闪着冷光')).toBe(false)
    expect(cleaned.includes('瞳孔散大至少')).toBe(false)
    expect(isStoreBlockingPureAiResistanceKey('hw_ledger_bill_reveal')).toBe(true)
  })


  test('never mid-splices bank stamps into host sentences', () => {
    const broken = [
      '林序一把按住保安的手腕，力道极大，将保安的手他先不急着写进系统，指腹在纸边停了一下。从扶手上拽了开来。',
      '林序脚下站定，身子被撞得晃了晃，但右手依然他嫌这事麻烦，手套边又被汗浸湿了一截。在平车的刹车杆上。',
      '他继续挡在推车前。',
    ].join('\n\n')
    const repaired = repairMidSentenceBankSplices(broken)
    expect(repaired.includes('手他先不急着')).toBe(false)
    expect(repaired.includes('依然他嫌这事麻烦')).toBe(false)
    expect(repaired.includes('他先不急着写进系统，指腹在纸边停了一下。')).toBe(true)
    expect(repaired.includes('他嫌这事麻烦，手套边又被汗浸湿了一截。')).toBe(true)
    // residual sanitize must not reintroduce mid-sentence splices for long host sentences
    const residual = sanitizeResidualPureAiHardEvidence(
      '林序一把按住保安的手腕，力道极大，将保安的手从扶手上拽了开来。\n\n他继续挡在推车前。',
    )
    expect(residual.includes('手他先')).toBe(false)
    expect(residual.includes('依然他嫌')).toBe(false)
  })



  test('zhuque narrative hard contract zero-family keys hard-fail and store-block', () => {
    const dirty = [
      '同样的皮肤温热，同样的毫无脉搏。',
      '这是所谓的“未划定区域”。',
      '顶部印着五个字：《失踪人员核销名册》。',
      '按常理，人没了呼吸和脉搏，体温会跟着迅速降下去。',
      '防空洞铁门方向，传来了隐隐约约的撞击声。',
    ].join('\n\n')
    const narrative = scanNarrativeHardContractRisks(dirty)
    expect(narrative.length).toBeGreaterThan(0)
    expect(narrative.every((f) => f.blocking && f.status === 'fail')).toBe(true)
    expect(narrative.some((f) => String(f.key).startsWith('hw_ncontract_'))).toBe(true)
    const score = scoreNarrativeHardContract(dirty)
    expect(score.pass).toBe(false)
    expect(score.hit).toBeGreaterThan(0)
    const report = evaluateHumanWebnovelResistance(dirty)
    expect(report.contract_score?.narrative_hard_pass).toBe(false)
    expect(report.hard_failures.some((f) => String(f.key).startsWith('hw_ncontract_'))).toBe(true)
    const nk = String(narrative[0].key)
    const soft = /abandoned|fate|essay_not_but|procedure|coincidence|semi_science|roster|ending_suspense|rule_ledger/.test(nk)
    expect(isStoreBlockingPureAiResistanceKey(nk)).toBe(soft ? false : true)
  })

  test('clean textured sample passes zhuque narrative hard contract', () => {
    const clean = [
      '笔帽被他咬出一道齿印。',
      '“这单谁签字？不是我顺路送来的！”',
      '他把湿纸角按在推车扶手上，鞋底蹭出一声涩响。',
      '“先不签。门外又压着下一单。”',
      '他只把门扣上一半，话留到门口再说。',
    ].join('\n\n')
    const score = scoreNarrativeHardContract(clean)
    expect(score.pass).toBe(true)
    const report = evaluateHumanWebnovelResistance(clean)
    expect(report.prompt_directives.some((d) => d.includes('朱雀叙事硬门槛'))).toBe(true)
  })

  test('r53 zhuque killers: undeclared zone lore, multi-body echo, bunker door ending, bank cap', () => {
    const dirty = [
      '这是所谓的“未划定区域”，既不属于急诊科，也不属于物业后勤的保卫范围。',
      '他拿出额温枪对着额头扣下扳机：36.5度。',
      '“这……这个怎么也这样？”',
      '走廊里只剩下林序、老张和小刘三个活人，还有三具带温的身体。',
      '医院常用的处方签上写着半截字。',
      '通道尽头的防空洞铁门方向，传来了隐隐约约的撞击声。像是有什么重物，在铁门另一侧轻轻拍打。',
      '他先不急着写进系统，指腹在纸边停了一下。',
      '纸页边被他捏出毛刺。',
      '他只盯住最刺眼的那一件。',
    ].join('\n\n')
    const pure = scanPureAiPatternFamilies(dirty)
    expect(pure.some((h) => String(h.key||'').includes('abandoned') || String(h.key||'').includes('multi_body') || String(h.key||'').includes('ending') || String(h.key||'').includes('roster') || String(h.key||'').includes('identity'))).toBe(true)
    const cleaned = sanitizeDetectorHostileStock(dirty)
    expect(cleaned.includes('未划定区域')).toBe(false)
    expect(cleaned.includes('三具带温的身体')).toBe(false)
    expect(cleaned.includes('防空洞铁门')).toBe(false)
    expect((cleaned.match(/他先不急着写进系统|纸页边被他捏出毛刺|他只盯住最刺眼/g) || []).length).toBeLessThanOrEqual(1)
  })

  test('r52 zhuque killers: multi-body same, roster selfmap, gear knock ending', () => {
    const dirty = [
      '同样的皮肤温热，同样的毫无脉搏。',
      '一小时内，连续两具毫无生命体征却维持着正常体温的尸体。',
      '顶部印着五个字：《失踪人员核销名册》。',
      '表格第一行写着那个工装男人的名字，后面打着红色的“已回收”印章。第二行是那个碎花棉袄的老太太。第三行是骑手年轻人。',
      '身份证号前六位和出生年月，与他自己的信息完全吻合。',
      '那声音像是生锈的齿轮在干磨，震得人心脏发紧。',
      '敲门声不疾不徐地响起来。',
      '啪、啪、啪。',
      '按常理，人没了呼吸和脉搏，体温会跟着迅速降下去。',
    ].join('\n\n')
    const pure = scanPureAiPatternFamilies(dirty)
    expect(pure.some((h) => h.key === 'hw_multi_body_same_death' || h.key === 'hw_multi_body_same_temp_chain' || h.key === 'hw_symmetry_pipeline')).toBe(true)
    expect(pure.some((h) => h.key === 'hw_roster_fate' || h.key === 'hw_self_name_reveal' || h.key === 'hw_identity_ticket_reveal')).toBe(true)
    expect(pure.some((h) => h.key === 'hw_ending_cinematic_stack' || h.key === 'hw_ending_suspense_template' || h.key === 'hw_ending_shadow_stretch')).toBe(true)
    const cleaned = sanitizeDetectorHostileStock(dirty)
    expect(cleaned.includes('同样的皮肤温热，同样的毫无脉搏')).toBe(false)
    expect(cleaned.includes('失踪人员核销名册')).toBe(false)
    expect(cleaned.includes('与他自己的信息完全吻合')).toBe(false)
    expect(cleaned.includes('生锈的齿轮')).toBe(false)
    expect(cleaned.includes('啪、啪、啪')).toBe(false)
  })

  test('r51 zhuque killers: halfcode stamp self-inject, LX selfmap, nightlamp gear ending', () => {
    const dirty = [
      '纸片上只有几行看不清的字。',
      '半截残码。他先把纸边折死。',
      'LX？',
      '他的编号，就是 LX。',
      '最上面一行写着：【暂存额度：1/3】。',
      '走廊上方那盏黄色夜灯闪烁了几下，散发出微弱而刺眼的光芒。',
      '没人退后，也没人再说话，只剩下粗重的呼吸声和电梯内部机械齿轮微弱的摩擦声。',
    ].join('\n\n')
    const pure = scanPureAiPatternFamilies(dirty)
    expect(pure.some((h) => h.key === 'hw_identity_halfcode_reveal' || h.key === 'hw_identity_ticket_reveal' || h.key === 'hw_ledger_bill_reveal')).toBe(true)
    expect(pure.some((h) => h.key === 'hw_ending_shadow_stretch' || h.key === 'hw_ending_cinematic_stack')).toBe(true)
    const cleaned = sanitizeDetectorHostileStock(dirty)
    expect(cleaned.includes('半截残码。他先把纸边折死')).toBe(false)
    expect(cleaned.includes('他的编号，就是 LX')).toBe(false)
    expect(cleaned.includes('【暂存额度')).toBe(false)
    expect(cleaned.includes('机械齿轮')).toBe(false)
    expect(cleaned.includes('黄色夜灯闪烁')).toBe(false)
    // sanitizer must not re-inject halfcode stamp
    expect((cleaned.match(/半截残码/g) || []).length).toBe(0)
  })

  test('r50 zhuque killers: halfcode, fate seal, shadow ending, nobody-cares, bank overuse', () => {
    const dirty = [
      'LX。',
      '林序。',
      '这是他名字的半截残码。',
      '背面盖着重叠在一起的规则齿轮，中央刻着一个干瘪的问号。',
      '他先不急着写进系统，指腹在纸边停了一下。',
      '纸页边被他捏出毛刺。',
      '他把话咽回去，先去拦人。',
      '他只抬手止住对方，没解释。',
      '那地方平时没人管。',
      '通道平时就没人过问。',
      '林序语气强硬得像一块石头，毫无商量余地。',
      '夜灯将两拨人僵持的身影拉得极长。',
    ].join('\n\n')
    const pure = scanPureAiPatternFamilies(dirty)
    expect(pure.some((h) => h.key === 'hw_identity_halfcode_reveal' || h.key === 'hw_identity_ticket_reveal')).toBe(true)
    expect(pure.some((h) => h.key === 'hw_fate_seal_emblem' || h.key === 'hw_fate_oracle')).toBe(true)
    expect(pure.some((h) => h.key === 'hw_ending_shadow_stretch' || h.key === 'hw_ending_cinematic_stack')).toBe(true)
    expect(pure.some((h) => h.key === 'hw_abandoned_nobody_cares_spam')).toBe(true)
    expect(pure.some((h) => h.key === 'hw_dramatic_simile_pack')).toBe(true)
    expect(isStoreBlockingPureAiResistanceKey('hw_private_noise_bank_overuse')).toBe(true)
    const cleaned = sanitizeDetectorHostileStock(dirty)
    expect(cleaned.includes('这是他名字的半截残码')).toBe(false)
    expect(cleaned.includes('规则齿轮')).toBe(false)
    expect(cleaned.includes('身影拉得极长')).toBe(false)
    expect(cleaned.split('平时没人管').length - 1).toBeLessThan(2)
    expect((cleaned.match(/他先不急着写进系统|纸页边被他捏出毛刺|他把话咽回去|他只抬手止住/g) || []).length).toBeLessThanOrEqual(2)
  })

  test('flags stamp garbage hybrid leftovers and strips them', () => {
    const sample = [
      '他捏住纸角。',
      '也他先把判断咽回去。',
      '【履约他先把证据收进内侧口袋。：3/3。后面还空着。者：林序】',
      '他把门反锁。',
    ].join('\n\n')
    const hard = scanPureAiPatternFamilies(sample)
    expect(hard.some((h) => h.key === 'hw_stamp_garbage_hybrid' || h.key === 'hw_self_name_reveal')).toBe(true)
    const cleaned = sanitizeDetectorHostileStock(sample)
    expect(cleaned.includes('也他先把')).toBe(false)
    expect(cleaned.includes('履约他先把')).toBe(false)
    expect(cleaned.includes('【履约')).toBe(false)
    expect(isStoreBlockingPureAiResistanceKey('hw_stamp_garbage_hybrid')).toBe(true)
  })
})


describe('r57 zhuque residual killers', () => {
  test('flags and strips bare LX selfmap + antithesis slogans + freeze ending', () => {
    const sample = [
      '他看清了纸上半行字。',
      '而LX，正是林序编号在大写拼音里的习惯用法。',
      '所有征象都在指向死亡。',
      '活人的温度，死人的体征。',
      '空气仿佛在这一刻凝固了。',
      '气氛紧绷得像是一根拉到极致的钢丝。',
      '他挺直了脊梁。',
      '连一步也没有让开。',
      '“先别推。”他扣住栏杆。',
    ].join('\n\n')
    const pure = scanPureAiPatternFamilies(sample)
    const keys = new Set(pure.map((h) => h.key))
    expect(
      keys.has('hw_identity_ticket_reveal') || keys.has('hw_self_name_reveal'),
    ).toBe(true)
    expect(
      keys.has('hw_pathology_essay_verdict') || keys.has('hw_ending_cinematic_stack'),
    ).toBe(true)
    const cleaned = sanitizeDetectorHostileStock(sample)
    expect(/\bLX\b|而LX/.test(cleaned)).toBe(false)
    expect(cleaned.includes('活人的温度')).toBe(false)
    expect(cleaned.includes('空气仿佛在这一刻凝固')).toBe(false)
    expect(cleaned.includes('挺直了脊梁')).toBe(false)
    expect(buildResistanceAdmissionHardFailures(cleaned).some((x) => String(x.code || '').includes('identity') || String(x.code || '') === 'hw_self_name_reveal')).toBe(false)
  })

  test('prompt directives mention r57 freeze and antithesis bans', () => {
    const dirs = buildHumanWebnovelResistancePromptDirectives()
    const joined = dirs.join('\n')
    expect(joined.includes('R57') || joined.includes('对仗') || joined.includes('空气凝固')).toBe(true)
  })
})

test('humanize_postprocess allows contract score movement when hard risk not worse', () => {
  // Same clean textured body; minor rewrite that may shift fingerprint contract counts.
  const before = [
    '他推开门。',
    '',
    '“先别动。”',
    '',
    '手套上还沾着水。他本想甩锅，却先把纸角按住。',
    '',
    '走廊有人脚步乱，对讲机里骂了句脏话。',
    '',
    '他喉头发紧，还是把签条塞回去了。',
  ].join('\n')
  const after = [
    '他推开门。',
    '',
    '“先别动。”',
    '',
    '手套上还沾着水。他本想甩锅，却先把纸角按住。',
    '',
    '走廊有人脚步乱，对讲机里骂了句脏话。',
    '',
    '他喉头发紧，把签条塞回去，转身去拿灯。',
  ].join('\n')
  const gateHumanize = selectFingerprintSafeProse(before, after, { stage: 'humanize_postprocess' })
  expect(gateHumanize.accepted).toBe(true)
})

test('r58 zhuque packaging sanitize strips physiology / compliance / fate-seal / english leak', () => {
  const raw = [
    '按照常规判断，这人死亡时间至少超过半小时。',
    '这根本不符合基本的生理学规律。',
    '林序抽出一根棉签，在男人的脚底划了一下，没有任何病理反射。',
    '医务科打过招呼了，今晚走绿色通道，林医生你别耽误我们合规交接。',
    '保安态度显得有些 impatient，不耐烦地摆了摆手。',
    '纸卡上面写的是：“给你的时间不多了。”',
    '他看到大厅挂钟的秒针，咔哒一声，停在了十二点的位置上。',
  ].join('\n\n')
  const cleaned = sanitizeR58ZhuqueKillers(raw)
  expect(cleaned).not.toContain('生理学规律')
  expect(cleaned).not.toContain('病理反射')
  expect(cleaned).not.toContain('绿色通道')
  expect(cleaned).not.toContain('合规交接')
  expect(cleaned).not.toContain('impatient')
  expect(cleaned).not.toContain('给你的时间不多了')
  expect(cleaned).not.toContain('停在了十二点')
  const stock = sanitizeDetectorHostileStock(raw)
  expect(stock).not.toContain('给你的时间不多了')
})

test('r60 dual-pass cinematic/clinical packaging sanitize', () => {
  const raw = [
    '一个心跳停止、瞳孔散大、听诊无心音的死人，体温和活人不太一样。',
    '那枚生锈的黑铁针顺时针拧了个怪异的角度，死死指在十二点方向。',
    '表盘深处，微小的齿轮正死死咬合，传出清晰的咔嗒声。',
    '绿荧荧的应急灯打在脸上。',
    '按章程过十分钟没生命体征就得进搁置室，后面排队入库的账谁结？',
  ].join('\n\n')
  const cleaned = sanitizeR60ZhuqueKillers(raw)
  expect(cleaned).not.toContain('心跳停止、瞳孔散大')
  expect(cleaned).not.toContain('听诊无心音')
  expect(cleaned).not.toContain('十二点方向')
  expect(cleaned).not.toContain('绿荧荧')
  expect(cleaned).not.toContain('搁置室')
  const stock = sanitizeDetectorHostileStock(raw)
  expect(stock).not.toContain('死死指在十二点')
})


test('r62 packaging strip ending freeze esophagus gear stamp without 刚才那个点 spam', () => {
  const raw = [
    '一脚迈了出去——',
    '电梯内部传出低沉的齿轮磨合声，仿佛一条巨大的食道正大张着口。',
    '指针重合在刚才那个点的位置。',
    '只能看清“物业合规”四个字。',
    '表针停在十二点。',
  ].join('\n\n')
  const cleaned = sanitizeR60ZhuqueKillers(raw)
  expect(cleaned).not.toContain('一脚迈了出去')
  expect(cleaned).not.toContain('巨大的食道')
  expect(cleaned).not.toContain('齿轮磨合声')
  expect(cleaned).not.toContain('物业合规')
  expect(cleaned).not.toContain('刚才那个点')
  expect(cleaned).not.toContain('十二点')
})


test('r63 packaging strip clinical lecture compliance shelf stamp without adding texture', () => {
  const raw = [
    '血液循环彻底停止、心电拉直的状态下，体温应该迅速散失。',
    '规程和合规，很多时候只是用来掩盖麻烦的工具。',
    '搁置室和连廊只进不出。',
    '“第三次履约，带温移交。”',
    '医院建筑图纸上未标注的死角，也是物业口中严禁触碰的合规禁区。',
    '但他已经没有退路了。',
    '尖锐牙酸的擦铁声。冰凉刺骨。',
  ].join('\n\n')
  const cleaned = sanitizeR63ZhuqueKillers(raw)
  expect(cleaned).not.toContain('血液循环彻底停止')
  expect(cleaned).not.toContain('规程和合规')
  expect(cleaned).not.toContain('搁置室')
  expect(cleaned).not.toContain('第三次履约')
  expect(cleaned).not.toContain('未标注的死角')
  expect(cleaned).not.toContain('合规禁区')
  expect(cleaned).not.toContain('没有退路了')
  expect(cleaned).not.toContain('牙酸')
  expect(cleaned).not.toContain('冰凉刺骨')
  const stock = sanitizeDetectorHostileStock(raw)
  expect(stock).not.toContain('搁置室')
})

test('r64 packaging strip clinical triad multi-body elevator freeze without adding texture', () => {
  const raw = [
    '心脏不跳了，呼吸停了，瞳孔散了，体温却稳稳押在活人的区间里。',
    '这不合逻辑。',
    '三个有体温的“非账上人员”。',
    '要是这批是回收品，下一个名字会写在谁的单子上？',
    '露出一张湿透的《暂存移交单》。',
    '字迹跟他在病历本上签了数千次的习惯一模一样。',
    '电梯井里忽地炸开一道闷响。',
    '卡在半空中的轿厢猛然往下顿了半寸，金属摩擦声刺得人。',
    '顶上最后一点微弱的应急灯灭了。',
    '黑漆漆的井底吹上来一股冷风，夹着股陈年腥气，迎面拍在两人脸上。',
    '冷气开得太猛，吹在脖子里有点发发发僵。',
    '笔尖在红色的方格纸上划出一道毫无波折的直线。',
    '直得像人用尺子比着画出来的。',
    '指尖底下死寂一片。',
    '比刚才那个夹克男人还要明显。',
    '推责任的熟练劲儿一听就是老油条了。',
  ].join('\n\n')
  const cleaned = sanitizeR64ZhuqueKillers(raw)
  expect(cleaned).not.toContain('心脏不跳了')
  expect(cleaned).not.toContain('这不合逻辑')
  expect(cleaned).not.toContain('非账上人员')
  expect(cleaned).not.toContain('回收品')
  expect(cleaned).not.toContain('暂存移交单')
  expect(cleaned).not.toContain('一模一样')
  expect(cleaned).not.toContain('卡在半空中的轿厢')
  expect(cleaned).not.toContain('黑漆漆的井底')
  expect(cleaned).not.toContain('发发发')
  expect(cleaned).not.toContain('毫无波折')
  expect(cleaned).not.toContain('尺子比着')
  expect(cleaned).not.toContain('死寂一片')
  expect(cleaned).not.toContain('夹克男人还要明显')
  expect(cleaned).not.toContain('老油条了')
  const stock = sanitizeDetectorHostileStock(raw)
  expect(stock).not.toContain('这不合逻辑')
  expect(stock).not.toContain('发发发')
})


test('r65 packaging strip procedure citation inventory elevator ending without texture', () => {
  const raw = [
    '“规章第十二条，急诊医生随时查验遗体状态。”',
    '交接规定写得清清楚楚，急诊负责遗体临时寄存！',
    '赶紧盖章！',
    '这字只要落下，出事就是非法处置。',
    '口袋里没身份证，只摸出一串生锈的钥匙，还有一张被水浸得发软的硬质塑胶卡。',
    '井道里响起铁链扯动的吱呀声，轿厢晃晃荡荡沉下来。',
    '老张平时连个夜班都恨不得躲值班室打盹，这会儿腰杆挺得比钢筋还硬。',
    '那张沾水揉烂的卡片、没心跳却带着热气的皮肉……',
    '散出一股子冲的石灰味。',
    '整个人斜着挤进了将要关合的门缝——',
  ].join('\n\n')
  const cleaned = sanitizeR65ZhuqueKillers(raw)
  expect(cleaned).not.toContain('规章第十二条')
  expect(cleaned).not.toContain('盖章')
  expect(cleaned).not.toContain('非法处置')
  expect(cleaned).not.toContain('生锈的钥匙')
  expect(cleaned).not.toContain('铁链扯动')
  expect(cleaned).not.toContain('钢筋还硬')
  expect(cleaned).not.toContain('石灰味')
  expect(cleaned).not.toContain('门缝——')
  const stock = sanitizeDetectorHostileStock(raw)
  expect(stock).not.toContain('规章第十二条')
  expect(stock).not.toContain('非法处置')
})


describe("sanitizeR66 ending packaging", () => {
  test("strips cm countdown and fate paper", () => {
    const raw = "门缝正在以不可逆的速度收窄。十厘米，十五厘米，二十厘米……防夹感应器没有任何反应。未完结，顺延下一位。"
    const out = sanitizeR66ZhuqueKillers(raw)
    expect(out.includes("防夹感应器")).toBe(false)
    expect(out.includes("不可逆的速度收窄")).toBe(false)
    expect(out.includes("顺延下一位")).toBe(false)
    const stock = sanitizeDetectorHostileStock(raw)
    expect(stock.includes("防夹感应器")).toBe(false)
  })
})


test('sanitizeMissingPrivateNoise injects fused mid private noise when missing', () => {
  const paras = Array.from({ length: 30 }, (_, i) => {
    if (i === 0) return '推车卡在门槛上。'
    if (i === 1) return '“进来。”'
    return `他检查了第${i}处细节，没有多话，继续往下写，把可见动作再确认一遍，然后回到桌边。`
  })
  const raw = paras.join('\n\n')
  const out = sanitizeMissingPrivateNoise(raw)
  expect(out.length).toBeGreaterThan(raw.length * 0.9)
  // should introduce at least one private-noise cue
  expect(/嫌|烦|先不|背锅|责任|懒得|改口|怕主任|谁担|谁背|别给我|先放|先糊|不想写|别扯/.test(out)).toBe(true)
  const stock = sanitizeDetectorHostileStock(raw)
  expect(/嫌|烦|先不|背锅|责任|懒得|改口|怕主任/.test(stock)).toBe(true)
})

describe('fix-brief A3-resistance regressions', () => {
  // #13: bare 刚想/伴随着 are ordinary connectors, not drama packaging.
  test('bare 刚想/伴随着 connectors do not trigger hw_mid_drama_packaged_conflict', () => {
    const pad = (i: number) => `走廊灯管吱吱响，地砖缝里积着灰，他数到第${i}步时鞋底还在发黏，手套边也湿了一截。`
    const normal = Array.from({ length: 48 }, (_, i) => {
      if (i === 16) return '他刚想开口，门口的人先说话了。'
      if (i === 20) return '他刚想坐下歇口气，登记台那边喊他名字。'
      if (i === 24) return '门外伴随着一阵脚步声，有人把车停在了走廊口。'
      return pad(i)
    }).join('\n\n')
    const hits = scanSocialConflictFrictionDelivery(normal)
    expect(hits.some((h) => h.key === 'hw_mid_drama_packaged_conflict')).toBe(false)
  })

  test('real drama packaging still triggers hw_mid_drama_packaged_conflict', () => {
    const pad = (i: number) => `走廊灯管吱吱响，地砖缝里积着灰，他数到第${i}步时鞋底还在发黏，手套边也湿了一截。`
    const drama = Array.from({ length: 48 }, (_, i) => {
      if (i === 16) return '他刚想仔细检查那张纸片，走廊外突然传来一阵嘈杂的脚步声。'
      if (i === 20) return '推车硬生生撞在林序膝盖上。'
      if (i === 24) return '他手掌死死抵住扶手。'
      return pad(i)
    }).join('\n\n')
    const hits = scanSocialConflictFrictionDelivery(drama)
    expect(hits.some((h) => h.key === 'hw_mid_drama_packaged_conflict')).toBe(true)
  })

  // #14: sanitize-injected stock sentences must not hit toxic-ai blocking rules themselves.
  test('coincidence omniscience stock injection passes toxic-ai blocking scan', () => {
    const raw = [
      '他把登记本合上。',
      '对方知道今晚是他值班。',
      '“先把人推进去。”',
      '他没接话。',
    ].join('\n\n')
    const cleaned = sanitizeDetectorHostileStock(raw)
    expect(cleaned).not.toContain('对方知道今晚')
    expect(cleaned).toContain('脊背')
    const blocking = scanToxicAiPatterns(cleaned).filter((f) => f.blocking || f.status === 'fail')
    expect(blocking).toEqual([])
  })

  test('fate oracle stock injection passes toxic-ai scan and avoids 有人说他+他 double subject', () => {
    const raw = [
      '走廊里有人压低声音议论。',
      '有人说他把体温卖了，才捂着这身热气。',
      '他没接话，先把车推走。',
    ].join('\n\n')
    const cleaned = sanitizeDetectorHostileStock(raw)
    expect(cleaned).not.toContain('把体温卖了')
    expect(cleaned).not.toContain('他他')
    const blocking = scanToxicAiPatterns(cleaned).filter((f) => f.blocking || f.status === 'fail')
    expect(blocking).toEqual([])
  })

  // #15: fingerprint-contract prompt_directives / avoid / prefer must survive the 72-line cap.
  test('contract prompt_directives, avoid and prefer lines reach the final directive array', () => {
    const contract: FingerprintContract = {
      ...sampleContract,
      prompt_directives: ['【测试合同】MARKER_PD_ZZ3 对白独立成段。'],
      avoid: ['MARKER_AVOID_ZZ1 临床连击'],
      prefer: ['MARKER_PREFER_ZZ2 短对白'],
    }
    const lines = buildHumanWebnovelResistancePromptDirectives(contract)
    expect(lines.some((l) => l.includes('MARKER_PD_ZZ3'))).toBe(true)
    expect(lines.some((l) => l.startsWith('规避：') && l.includes('MARKER_AVOID_ZZ1'))).toBe(true)
    expect(lines.some((l) => l.startsWith('优先：') && l.includes('MARKER_PREFER_ZZ2'))).toBe(true)
    // narrative-hard head lines must still lead
    expect(lines.some((l) => l.includes('朱雀叙事硬门槛'))).toBe(true)
  })

  // #16: long no-comma monologue walls must split near the middle, not hard-cut at char 12.
  test('long no-comma monologue wall splits near the middle instead of char 12', () => {
    const wall = '灰蒙蒙的天光顺着窗缝一点点爬进来照在那排旧柜子上又顺着柜面淌到地砖上他看着那道光从柜角慢慢挪到桌腿边始终没有挪开视线也没有伸手去拦更没有去碰桌上那杯凉透的茶'
    expect(wall.length).toBeGreaterThan(64)
    const pad = (i: number) => `窗外的雨声一直没停，他把第${i}份材料翻过去检查装订边，顺手把回形针捋直又弯回去，桌上的台灯闪了两下，他伸手拧了拧灯座，光稳住了，他把椅子往桌前拖了半寸，接着往下翻。`
    const paras = Array.from({ length: 18 }, (_, i) => (i === 8 ? wall : pad(i)))
    const raw = paras.join('\n\n')
    const out = sanitizeMidMonologueGreenDensity(raw)
    const outParas = out.split(/\n+/).map((p) => p.trim()).filter(Boolean)
    // buggy behavior: hard cut at char 12
    expect(outParas).not.toContain(wall.slice(0, 12))
    // fixed behavior: cut falls back to the middle when no comma exists before it
    const mid = Math.floor(wall.length / 2)
    expect(outParas).toContain(wall.slice(0, mid))
  })

  // #17: 依然是 is an ordinary copula — it must not count toward isomorphism nor be spliced mid-sentence.
  test('ordinary copula 依然是 text is left untouched by symmetric isomorphism sanitize and scan', () => {
    const text = [
      '窗外的天依然是灰的。',
      '袖口依然是那道洗不掉的墨渍。',
      '两份笔记一模一样。',
      '他把笔记塞回抽屉。',
    ].join('\n\n')
    const cleaned = sanitizeSymmetricIsomorphism(text)
    expect(cleaned).toBe(text)
    expect(cleaned).not.toContain('有点不对')
    const slip = scanSymmetricReadingCascadeRisks(text).filter((f) => f.key === 'hw_symmetric_slip_inventory')
    expect(slip).toEqual([])
  })

  test('true multi-item isomorphism is still softened after first occurrence', () => {
    const text = [
      '三张单据完全相同。',
      '编号一模一样。',
      '背面同样印着一排小字。',
      '他把单据收进口袋。',
    ].join('\n\n')
    const cleaned = sanitizeSymmetricIsomorphism(text)
    expect(cleaned).not.toBe(text)
    expect(cleaned).toContain('完全相同')
    expect(cleaned).toContain('有点不对')
  })

  // #18: the leftover-cleanup regex must only collapse the literal stock sentence, not a char class.
  test('ordinary 就可以直接… continuations are not swallowed by the stock-leftover cleanup', () => {
    const cleanedA = sanitizeDetectorHostileStock('把资料整理好，就可以直接把这批单子交上去了。')
    expect(cleanedA).toContain('就可以直接把这批单子交上去了')
    expect(cleanedA).not.toContain('他不想现在就把这单写进系统')
    const cleanedB = sanitizeDetectorHostileStock('走完流程，就可以直接进系统备案。')
    expect(cleanedB).toContain('就可以直接进系统备案')
    expect(cleanedB).not.toContain('他不想现在就把这单写进系统')
  })

  test('literal stock sentence after 就可以直接 is still collapsed', () => {
    const cleaned = sanitizeDetectorHostileStock('走完流程，就可以直接签署死亡确认书。')
    expect(cleaned).toContain('走完流程，他不想现在就把这单写进系统。')
    expect(cleaned).not.toContain('就可以直接他不想')
  })

  // #19: the risk-scan guard must actually gate the rewrite (no injection into clean openings).
  test('opening process pipeline sanitize is a no-op when the scan reports no risks', () => {
    const clean = Array.from({ length: 12 }, (_, i) => (
      `巷子口的水洼映着招牌灯，第${i + 1}块石板翘着角，他绕开积水往里走，伞骨上的水珠顺着滑下来，打湿了半边裤脚。`
    )).join('\n\n')
    expect(scanOpeningProcessPipelineRisks(clean)).toEqual([])
    expect(sanitizeOpeningProcessPipeline(clean)).toBe(clean)
  })

  // #21: soft density hint must use type-legal severity and non-hard status
  // (evaluate hard_failures filter is status==='fail' || blocking).
  test('mid monologue green density finding is a soft advisory, not a latent hard failure', () => {
    const mono = Array.from({ length: 24 }, (_, i) => (
      `他把第${i + 1}条线索在脑子里过了一遍，又把先后顺序倒过来排了一次，越排越觉出不对，但还是压着性子继续往下想。`
    )).join('\n\n')
    const risks = scanMidMonologueGreenDensityRisks(mono)
    const finding = risks.find((f) => f.key === 'hw_mid_monologue_green_density')
    expect(finding).toBeTruthy()
    expect(finding?.blocking).toBe(false)
    expect(finding?.severity).toBe('advisory')
    expect(finding?.status).toBe('warn')
  })
})

/**
 * Regresses the writing-path/management-page desync bug directly: the no-cwd,
 * no-contract call (evaluateHumanWebnovelResistance(text), matching every
 * generation-time caller) must resolve the fingerprint contract through the
 * same activeWorkspace-first path as fingerprint-contract-resolver.test.ts
 * proves for resolveFingerprintContractInfo(). Before the fix, a default
 * parameter (`cwd = process.cwd()`) made loadActiveFingerprintContract()'s
 * cwd always defined, so it always skipped the activeWorkspace branch and
 * fell back to the repo-relative contract instead. mock.module() is global
 * to the process, so this stays in its own describe with beforeAll/afterAll
 * to leave every other test file in the regression run unaffected.
 */
describe('evaluateHumanWebnovelResistance follows the active workspace when no contract/cwd is given', () => {
  let fakeWorkspace: string

  beforeAll(async () => {
    fakeWorkspace = await mkdtemp(join(tmpdir(), 'mangaforge-hwr-active-workspace-'))
    await mkdir(join(fakeWorkspace, 'fingerprint-lib', 'contracts'), { recursive: true })
    await writeFile(
      join(fakeWorkspace, 'fingerprint-lib', 'contracts', 'active-contract.json'),
      JSON.stringify({
        version: 1,
        name: 'FAKE_WS_CONTRACT',
        built_from: ['s1'],
        target: {
          cv_para: [0.4, 0.8],
          single_sentence_para_ratio: [0.7, 0.98],
          two_sentence_para_ratio: [0.02, 0.2],
          dialogue_para_ratio: [0.08, 0.4],
          max_mid_streak_max: 8,
          template_contrast_per_1k_max: 2,
          stock_adverb_per_1k_max: 2,
          clinical_hit_per_1k_max: 0.5,
          subject_ta_opener_ratio_max: 0.4,
        },
        avoid: ['临床连击'],
        prefer: ['短对白'],
        prompt_directives: ['【测试合同】对白独立成段。'],
      }),
      'utf8',
    )
    mock.module('../workspace', () => ({
      ...realWorkspaceModule,
      loadActiveWorkspaceSync: () => fakeWorkspace,
    }))
  })

  afterAll(async () => {
    mock.module('../workspace', () => realWorkspaceModule)
    await rm(fakeWorkspace, { recursive: true, force: true })
  })

  test('resolves the mocked active workspace contract, not the repo builtin', () => {
    const report = evaluateHumanWebnovelResistance('他推开门，屋里没有开灯。')
    expect(report.contract_name).toBe('FAKE_WS_CONTRACT')
    expect(report.contract_name).not.toBe('qidian_free_rank_human')
  })
})
