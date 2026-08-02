import { describe, expect, test } from 'bun:test'
import {
  assertProseQualityCanStore,
  buildFocusedProseReviewPrompt,
  buildFocusedProseRevisionPrompt,
  buildProseQualityDecision,
  isUsableProseQualityReviewPayload,
  normalizeProseQualityReview,
  proseQualityReviewMaxTokensForAttempt,
  runProseQualityLoop,
} from './prose-quality-loop'

const sixDimensionScores = {
  continuity: 7,
  core_promise_agency: 7,
  conflict_causality: 7,
  payoff_hook: 7,
  prose_style: 7,
  fact_setting_safety: 8,
}

describe('bounded prose quality loop', () => {
  test('raises only the second semantic review attempt budget', () => {
    expect(proseQualityReviewMaxTokensForAttempt(1)).toBe(5_000)
    expect(proseQualityReviewMaxTokensForAttempt(2)).toBe(10_000)
    expect(proseQualityReviewMaxTokensForAttempt(99)).toBe(10_000)
    expect(proseQualityReviewMaxTokensForAttempt(Number.POSITIVE_INFINITY)).toBe(5_000)
  })

  test('rejects ambiguous low-range scores without an explicit 0-100 scale', () => {
    expect(isUsableProseQualityReviewPayload({
      score: 4.8,
      dimensions: sixDimensionScores,
      findings: [],
    })).toBe(false)
    expect(isUsableProseQualityReviewPayload({
      score: 88,
      score_scale: '0-100',
      dimensions: sixDimensionScores,
      findings: [],
    })).toBe(true)
    expect(isUsableProseQualityReviewPayload({
      score: 4.8,
      score_scale: '0-5',
      dimensions: sixDimensionScores,
      findings: [],
    })).toBe(false)
    expect(isUsableProseQualityReviewPayload({
      score: 88,
      score_scale: '0-100',
      dimensions: Object.fromEntries(Object.keys(sixDimensionScores).map(key => [key, null])),
      findings: [],
    })).toBe(false)
    expect(isUsableProseQualityReviewPayload({
      score: 88,
      score_scale: '0-100',
      dimensions: Object.fromEntries(Object.keys(sixDimensionScores).map(key => [key, ''])),
      findings: [],
    })).toBe(false)
  })

  test('rejects score values that only become numeric through primitive coercion', () => {
    for (const score of [null, '', '   ', true, false]) {
      expect(isUsableProseQualityReviewPayload({
        score,
        score_scale: '0-100',
        dimensions: sixDimensionScores,
        findings: [],
      })).toBe(false)
    }
  })

  test('rejects dimension values that only become numeric through primitive coercion', () => {
    for (const continuity of [null, '', '   ', true, false]) {
      expect(isUsableProseQualityReviewPayload({
        score: 88,
        score_scale: '0-100',
        dimensions: { ...sixDimensionScores, continuity },
        findings: [],
      })).toBe(false)
    }
  })

  test('accepts finite numeric values and non-empty finite numeric strings', () => {
    expect(isUsableProseQualityReviewPayload({
      score: 0,
      dimensions: Object.fromEntries(Object.keys(sixDimensionScores).map(key => [key, 0])),
      findings: [],
    })).toBe(true)
    expect(isUsableProseQualityReviewPayload({
      score: '88',
      score_scale: '0-100',
      dimensions: Object.fromEntries(Object.entries(sixDimensionScores).map(([key, value]) => [key, String(value)])),
      findings: [],
    })).toBe(true)
  })

  test('runs a fresh deterministic scan and independent review after revision', async () => {
    const scans: string[] = []
    const reviews: string[] = []
    const result = await runProseQualityLoop({
      initialText: '初稿：追兵围住江澈，他站在门边没有动作。',
      minScore: 78,
      coreContract: { chapter_no: 10, reader_promise: '主角主动破局' },
      scan: text => {
        scans.push(text)
        return {
          hard_failures: text.startsWith('初稿')
            ? [{ key: 'agency', message: '主角没有行动' }]
            : [],
        }
      },
      review: async ({ text }) => {
        reviews.push(text)
        return text.startsWith('初稿')
          ? {
              score: 70,
              dimensions: sixDimensionScores,
              findings: [{
                key: 'agency',
                severity: 'S2',
                dimension: 'core_promise_agency',
                evidence: '江澈，他站在门边没有动作。',
                required_change: '让江澈主动破围',
                acceptance_test: '包围因主角动作改变',
              }],
            }
          : {
              score: 86,
              dimensions: { ...sixDimensionScores, core_promise_agency: 9, payoff_hook: 9 },
              publishable: true,
              findings: [],
            }
      },
      revise: async () => ({
        final_text: '江澈撞翻油灯，火舌封住门口。他趁追兵偏头，一脚踹开后窗，先把顾遥送出去，自己再扯落窗框挡住刀锋。',
      }),
    })

    expect(scans).toHaveLength(2)
    expect(reviews).toHaveLength(2)
    expect(reviews[1]).toBe(result.final_text)
    expect(result.decision.passed).toBe(true)
    expect(result.rounds).toHaveLength(1)
  })

  test('does not revise for unlocatable evidence', async () => {
    let revisionCalls = 0
    const result = await runProseQualityLoop({
      initialText: '江澈推开仓门，铜锁坠在地上。'.repeat(80),
      minScore: 78,
      coreContract: { chapter_no: 10 },
      scan: () => ({ hard_failures: [] }),
      review: async () => ({
        score: 90,
        publishable: true,
        dimensions: sixDimensionScores,
        findings: [{
          key: 'invented_waiting',
          severity: 'S2',
          dimension: 'core_promise_agency',
          evidence: '江澈全程站着等待救援。',
          required_change: '让江澈主动破局',
          acceptance_test: '主角行动改变结果',
        }],
      }),
      revise: async () => {
        revisionCalls += 1
        return { final_text: '不应调用。' }
      },
    })

    expect(revisionCalls).toBe(0)
    expect(result.rounds).toHaveLength(0)
    expect(result.decision).toMatchObject({ passed: true, hard_failures: [] })
    expect(result.decision.advisory_failures.join('｜')).toContain('invented_waiting')
  })

  test('passes only locatable evidence findings into a mixed revision', async () => {
    let revisionInput: any = null
    let reviewCalls = 0
    const result = await runProseQualityLoop({
      initialText: '江澈推开仓门，铜锁坠在地上。'.repeat(80),
      minScore: 78,
      coreContract: { chapter_no: 10 },
      scan: () => ({ hard_failures: [] }),
      review: async () => {
        reviewCalls += 1
        return reviewCalls === 1
          ? {
              score: 90,
              dimensions: sixDimensionScores,
              findings: [
                {
                  key: 'locatable_causality',
                  severity: 'S2',
                  dimension: 'conflict_causality',
                  evidence: '铜锁坠在地上。',
                  required_change: '补足铜锁坠地的动作原因',
                  acceptance_test: '动作与结果形成因果链',
                },
                {
                  key: 'invented_waiting',
                  severity: 'S2',
                  dimension: 'core_promise_agency',
                  evidence: '江澈全程站着等待救援。',
                  required_change: '让江澈主动破局',
                  acceptance_test: '主角行动改变结果',
                },
              ],
            }
          : { score: 90, dimensions: sixDimensionScores, findings: [] }
      },
      revise: async input => {
        revisionInput = input
        return { final_text: '江澈抬脚踢断锁链，仓门应声弹开。'.repeat(80) }
      },
    })

    expect(result.rounds).toHaveLength(1)
    expect(revisionInput.blockingFindings).toEqual([
      expect.objectContaining({ key: 'locatable_causality' }),
    ])
    expect(revisionInput.prompt).toContain('locatable_causality')
    expect(revisionInput.prompt).not.toContain('invented_waiting')
  })

  test('passes a mixed deterministic advisory and semantic obligation into revision unchanged', async () => {
    const initialText = '江澈推开仓门，如同铁钉落地，回声穿过空仓；下一刻人物忽然站到门外。'.repeat(80)
    const advisoryScan = {
      hard_failures: [],
      advisory_findings: [{
        pattern: '如同',
        matched_text: '如同',
        evidence: '如同铁钉落地',
        fix: '改成具体动作或事实描写',
      }],
    }
    let revisionInput: any = null
    let reviewCalls = 0
    const result = await runProseQualityLoop({
      initialText,
      minScore: 78,
      coreContract: { chapter_no: 10 },
      scan: () => advisoryScan,
      review: async () => {
        reviewCalls += 1
        return reviewCalls === 1
          ? {
              score: 90,
              publishable: true,
              dimensions: sixDimensionScores,
              findings: [{
                key: 'style_comparison_with_continuity',
                severity: 'S2',
                dimension: 'prose_style',
                evidence: '如同铁钉落地',
                required_change: '删除“如同”，并补足人物移动承接和动作因果断裂',
                acceptance_test: '正文不再出现“如同”，且人物移动连续、动作结果有因果',
              }],
            }
          : {
              score: 90,
              publishable: true,
              dimensions: sixDimensionScores,
              findings: [],
            }
      },
      revise: async input => {
        revisionInput = input
        return { final_text: '江澈推开仓门，铁钉般的回声落进空仓。他跨过门槛走到门外。'.repeat(80) }
      },
    })

    expect(result.rounds).toHaveLength(1)
    expect(revisionInput.blockingFindings).toEqual([
      expect.objectContaining({
        key: 'style_comparison_with_continuity',
        required_change: '删除“如同”，并补足人物移动承接和动作因果断裂',
      }),
    ])
  })

  test('keeps the exact action fact and scene-consequence style repair advisory out of revision', async () => {
    const initialText = '江澈推开仓门，如同铁钉落地，回声穿过空仓。'.repeat(80)
    const advisoryScan = {
      hard_failures: [],
      advisory_findings: [{
        pattern: '如同',
        matched_text: '如同',
        evidence: '如同铁钉落地',
        fix: '改成具体动作、事实或现场后果描写',
      }],
    }
    let revisionCalls = 0
    const result = await runProseQualityLoop({
      initialText,
      minScore: 78,
      scan: () => advisoryScan,
      review: async () => ({
        score: 90,
        publishable: true,
        dimensions: sixDimensionScores,
        findings: [{
          key: 'style_comparison_replacement',
          severity: 'S2',
          dimension: 'prose_style',
          evidence: '如同铁钉落地',
          required_change: '删除如同，改成具体动作/事实/现场后果描写',
          acceptance_test: '正文不再出现如同',
        }],
      }),
      revise: async () => {
        revisionCalls += 1
        return { final_text: '不应调用。' }
      },
    })

    expect(result.decision).toMatchObject({ passed: true, approvable: true, hard_failures: [] })
    expect(result.decision.advisory_failures.join('｜')).toContain('style_comparison_replacement')
    expect(revisionCalls).toBe(0)
  })

  test('keeps unproven mixed obligations blocking and passes each one into revision', async () => {
    const mixedObligations = [
      '删除如同，并让角色主动做出选择',
      '删除如同，补足配角的行为反应',
      '删除如同，修复空间衔接',
    ]

    for (const requiredChange of mixedObligations) {
      const initialText = '江澈推开仓门，如同铁钉落地，回声穿过空仓。'.repeat(80)
      const advisoryScan = {
        hard_failures: [],
        advisory_findings: [{
          pattern: '如同',
          matched_text: '如同',
          evidence: '如同铁钉落地',
          fix: '删除如同并改成直接描写',
        }],
      }
      let revisionInput: any = null
      let reviewCalls = 0
      const result = await runProseQualityLoop({
        initialText,
        minScore: 78,
        scan: () => advisoryScan,
        review: async () => {
          reviewCalls += 1
          return reviewCalls === 1
            ? {
                score: 90,
                publishable: true,
                dimensions: sixDimensionScores,
                findings: [{
                  key: 'style_comparison_with_unproven_obligation',
                  severity: 'S2',
                  dimension: 'prose_style',
                  evidence: '如同铁钉落地',
                  required_change: requiredChange,
                  acceptance_test: '正文不再出现如同',
                }],
              }
            : {
                score: 90,
                publishable: true,
                dimensions: sixDimensionScores,
                findings: [],
              }
        },
        revise: async input => {
          revisionInput = input
          return { final_text: '江澈推开仓门，铁钉落地般的回声穿过空仓。'.repeat(80) }
        },
      })

      expect(result.rounds).toHaveLength(1)
      expect(revisionInput.blockingFindings).toEqual([
        expect.objectContaining({ required_change: requiredChange }),
      ])
    }
  })

  test('rejects trailing obligation bypasses after an advisory deletion phrase', async () => {
    const bypasses = [
      '删除如同的比喻同时让角色主动做出选择',
      '删除如同这一措辞后让角色主动做出选择',
      '删除如同还要补足空间衔接',
    ]

    for (const requiredChange of bypasses) {
      const initialText = '江澈推开仓门，如同铁钉落地，回声穿过空仓。'.repeat(80)
      const advisoryScan = {
        hard_failures: [],
        advisory_findings: [{
          pattern: '如同',
          matched_text: '如同',
          evidence: '如同铁钉落地',
          fix: '删除如同并改成直接描写',
        }],
      }
      let revisionInput: any = null
      let reviewCalls = 0
      const result = await runProseQualityLoop({
        initialText,
        minScore: 78,
        scan: () => advisoryScan,
        review: async () => {
          reviewCalls += 1
          return reviewCalls === 1
            ? {
                score: 90,
                publishable: true,
                dimensions: sixDimensionScores,
                findings: [{
                  key: 'style_comparison_with_trailing_obligation',
                  severity: 'S2',
                  dimension: 'prose_style',
                  evidence: '如同铁钉落地',
                  required_change: requiredChange,
                  acceptance_test: '正文不再出现如同',
                }],
              }
            : {
                score: 90,
                publishable: true,
                dimensions: sixDimensionScores,
                findings: [],
              }
        },
        revise: async input => {
          revisionInput = input
          return { final_text: '江澈推开仓门，铁钉落地般的回声穿过空仓。'.repeat(80) }
        },
      })

      expect(result.rounds).toHaveLength(1)
      expect(revisionInput.blockingFindings).toEqual([
        expect.objectContaining({ required_change: requiredChange }),
      ])
    }
  })

  test('normalizes safe repair residue before the fresh scan and independent recheck', async () => {
    const scans: string[] = []
    let reviewCalls = 0
    const rawRevision = '他用纯肉身力量 and 借力卸力踩碎规则。手臂微微鼓胀，没有一丝多余的颤音。他缓缓收手，轻轻敲击袖口，灯光犹如实质的毒液。顾遥从门边拉走伤员。'
    const normalizedRevision = '他用纯肉身力量和借力卸力踩碎规则。手臂鼓胀，没有多余的颤音。他收手，敲击袖口，灯光像泼下的毒液。顾遥从门边拉走伤员。'
    const result = await runProseQualityLoop({
      initialText: '初稿问题，追兵围住江澈，他站在门边没有动作。',
      minScore: 78,
      coreContract: { chapter_no: 10 },
      scan: text => {
        scans.push(text)
        const hardFailures = /\band\b/.test(text)
          ? [{ key: 'language_drift_latin_fragment', message: 'and' }]
          : []
        return { hard_failures: hardFailures }
      },
      review: async ({ text }) => {
        reviewCalls += 1
        if (reviewCalls === 1) {
          return {
              score: 70,
              dimensions: sixDimensionScores,
              findings: [{
                key: 'style',
                severity: 'S2',
                dimension: 'prose_style',
                evidence: '初稿问题',
                required_change: '改成可见动作',
                acceptance_test: '不再出现原句',
              }],
            }
        }
        const residue = text.match(/微微|一丝|缓缓|轻轻|犹如/)?.[0]
        return residue
          ? {
              score: 70,
              dimensions: sixDimensionScores,
              findings: [{
                key: 'prose_style_ai_slop',
                severity: 'S2',
                dimension: 'prose_style',
                evidence: residue,
                required_change: '删除修订残留',
                acceptance_test: '全文不再命中',
              }],
            }
          : { score: 88, dimensions: sixDimensionScores, publishable: true, findings: [] }
      },
      revise: async () => ({
        final_text: rawRevision,
      }),
    })

    expect(scans).toHaveLength(2)
    expect(scans[1]).not.toMatch(/\band\b|微微|一丝|缓缓|轻轻|犹如/)
    expect(result.rounds[0]?.selection).toMatchObject({ accepted: true, text: normalizedRevision })
    expect(result.final_text).toBe(scans[1])
    expect(result.final_text).toBe(normalizedRevision)
    expect(result.decision.passed).toBe(true)
  })

  test('retries one unusable independent recheck before failing closed', async () => {
    const reviewAttempts: Array<{ round: number; attempt: number | undefined }> = []
    let recheckCalls = 0
    const result = await runProseQualityLoop({
      initialText: '初稿问题，追兵围住江澈，他站在门边没有动作。',
      minScore: 78,
      coreContract: { chapter_no: 10 },
      scan: () => ({ hard_failures: [] }),
      review: async ({ round, attempt }) => {
        reviewAttempts.push({ round, attempt })
        if (round === 0) {
          return {
            score: 70,
            dimensions: sixDimensionScores,
            findings: [{
              key: 'agency',
              severity: 'S2',
              dimension: 'core_promise_agency',
              evidence: '初稿问题',
              required_change: '让主角主动破局',
              acceptance_test: '主角行动改变结果',
            }],
          }
        }
        recheckCalls += 1
        return recheckCalls === 1
          ? {}
          : { score: 88, score_scale: '0-100', dimensions: sixDimensionScores, publishable: true, findings: [] }
      },
      revise: async () => ({
        final_text: '江澈先扯断吊灯绳，铜架砸散门口的追兵。他抄起账册撞开侧窗，把顾遥推出包围，落地时又夺回了藏在线轴里的钥匙。',
      }),
    })

    expect(result.decision.passed).toBe(true)
    expect(recheckCalls).toBe(2)
    expect(reviewAttempts).toEqual([
      { round: 0, attempt: 1 },
      { round: 1, attempt: 1 },
      { round: 1, attempt: 2 },
    ])
  })

  test('stops after exactly one failed revision round', async () => {
    let revisionCalls = 0
    const result = await runProseQualityLoop({
      initialText: '主角等待。'.repeat(120),
      minScore: 78,
      coreContract: { chapter_no: 10 },
      scan: () => ({ hard_failures: [] }),
      review: async () => ({
        score: 70,
        dimensions: sixDimensionScores,
        findings: [{
          key: 'agency',
          severity: 'S2',
          dimension: 'core_promise_agency',
          evidence: '主角等待。',
          required_change: '主动行动',
          acceptance_test: '主角改变结果',
        }],
      }),
      revise: async ({ round }) => {
        revisionCalls += 1
        return { final_text: `第${round}轮修订：主角等待。`.repeat(120) }
      },
    })

    expect(revisionCalls).toBe(1)
    expect(result.rounds).toHaveLength(1)
    expect(result.decision.passed).toBe(false)
  })

  test('retains revised prose when recheck callback fails without persisting exception text', async () => {
    const leakSentinel = 'MODEL_CONTROLLED_BODY_SENTINEL'
    let reviewCalls = 0
    const revisedText = '修订正文带来新的追捕令。'.repeat(120)
    const result = await runProseQualityLoop({
      initialText: '初稿问题。'.repeat(120),
      minScore: 78,
      coreContract: { chapter_no: 10 },
      scan: () => ({ hard_failures: [] }),
      review: async () => {
        reviewCalls += 1
        if (reviewCalls > 1) throw new Error(leakSentinel)
        return {
          score: 70,
          dimensions: sixDimensionScores,
          findings: [{
            key: 'hook',
            severity: 'S2',
            dimension: 'payoff_hook',
            evidence: '初稿问题。',
            required_change: '补章末新问题',
            acceptance_test: '末段形成明确翻页理由',
          }],
        }
      },
      revise: async () => ({ final_text: revisedText }),
    })

    expect(result.final_text).toBe(revisedText)
    expect(result.final_review.score).toBe(70)
    expect(reviewCalls).toBe(2)
    expect(JSON.stringify(result)).not.toContain(leakSentinel)
    expect(result.decision).toMatchObject({
      passed: false,
      approvable: true,
      score: 70,
      hard_failures: [],
    })
    expect(result.decision.advisory_failures.join('｜')).toContain('quality_recheck_unavailable')
    expect(result.quality_warning).toMatchObject({ code: 'quality_recheck_unavailable', source: 'review' })
  })

  test('preserves prior complete prose when optional revision is unavailable', async () => {
    const initialText = '江澈撞开铁门，追兵被迫后撤。他夺下通讯器，立刻切断频道。顾遥跟上来，指向楼梯。两人继续追击。'.repeat(30)
    const result = await runProseQualityLoop({
      initialText,
      minScore: 78,
      scan: () => ({ hard_failures: [], advisory_findings: [] }),
      review: async () => ({
        score: 72,
        publishable: true,
        dimensions: sixDimensionScores,
        findings: [{
          key: 'agency',
          severity: 'S2',
          dimension: 'core_promise_agency',
          evidence: '江澈撞开铁门',
          required_change: '补足行动代价',
          acceptance_test: '行动产生可见代价',
        }],
      }),
      revise: async () => { throw new Error('revision provider unavailable') },
    })

    expect(result.final_text).toBe(initialText)
    expect(result.quality_warning).toMatchObject({ code: 'quality_revision_unavailable', source: 'review' })
    expect(result.decision.advisory_failures.join('｜')).toContain('quality_revision_unavailable')
    expect(JSON.stringify(result)).not.toContain('revision provider unavailable')
  })

  test('retains fresh deterministic hard failures when revised prose recheck is unavailable', async () => {
    let reviewCalls = 0
    const revisedText = '修订正文仍有确定性冲突。'.repeat(120)
    const result = await runProseQualityLoop({
      initialText: '初稿问题。'.repeat(120),
      minScore: 78,
      scan: text => ({
        hard_failures: text === revisedText
          ? [{ key: 'canonical_conflict', message: '修订正文仍与既有事实冲突' }]
          : [],
      }),
      review: async () => {
        reviewCalls += 1
        if (reviewCalls > 1) return {}
        return {
          score: 70,
          dimensions: sixDimensionScores,
          findings: [{
            key: 'hook', severity: 'S2', dimension: 'payoff_hook', evidence: '初稿问题。',
            required_change: '补章末问题', acceptance_test: '末段形成翻页理由',
          }],
        }
      },
      revise: async () => ({ final_text: revisedText }),
    })

    expect(result.final_text).toBe(revisedText)
    expect(result.decision).toMatchObject({
      passed: false,
      approvable: false,
      hard_failures: [{ key: 'canonical_conflict', message: '修订正文仍与既有事实冲突', source: 'deterministic' }],
    })
    expect(result.decision.hard_failures.some(item => item.source === 'llm')).toBe(false)
  })

  test('rethrows abort-like initial review and recheck control flow', async () => {
    for (const abortError of [
      Object.assign(new Error('operation aborted'), { name: 'AbortError' }),
      Object.assign(new Error('request canceled'), { code: 'ABORT_ERR' }),
      Object.assign(new Error('request canceled'), { code: 'REQUEST_CANCELED' }),
      Object.assign(new Error('canceled'), { code: 'ERR_CANCELED' }),
    ]) {
      const initialCaught = await runProseQualityLoop({
        initialText: '初稿。'.repeat(120),
        minScore: 78,
        scan: () => ({ hard_failures: [] }),
        review: async () => { throw abortError },
        revise: async () => ({ final_text: '不会调用。' }),
      }).then(() => null, error => error)
      expect(initialCaught).toBe(abortError)
    }

    const recheckAbort = Object.assign(new Error('request canceled'), { code: 'REQUEST_CANCELED' })
    let reviewCalls = 0
    const recheckCaught = await runProseQualityLoop({
      initialText: '初稿问题。'.repeat(120),
      minScore: 78,
      scan: () => ({ hard_failures: [] }),
      review: async () => {
        reviewCalls += 1
        if (reviewCalls > 1) throw recheckAbort
        return {
          score: 70,
          dimensions: sixDimensionScores,
          findings: [{
            key: 'hook', severity: 'S2', dimension: 'payoff_hook', evidence: '初稿问题。',
            required_change: '补章末问题', acceptance_test: '末段形成翻页理由',
          }],
        }
      },
      revise: async () => ({ final_text: '修订正文。'.repeat(120) }),
    }).then(() => null, error => error)
    expect(recheckCaught).toBe(recheckAbort)
  })

  test('treats an empty structured recheck as unavailable', async () => {
    let reviewCalls = 0
    const result = await runProseQualityLoop({
      initialText: '初稿问题。'.repeat(120),
      minScore: 78,
      coreContract: { chapter_no: 10 },
      scan: () => ({ hard_failures: [] }),
      review: async () => {
        reviewCalls += 1
        return reviewCalls === 1
          ? {
              score: 70,
              dimensions: sixDimensionScores,
              findings: [{
                key: 'hook',
                severity: 'S2',
                dimension: 'payoff_hook',
                evidence: '初稿问题。',
                required_change: '补章末问题',
                acceptance_test: '末段形成翻页理由',
              }],
            }
          : {}
      },
      revise: async () => ({ final_text: '修订正文带来新的追捕令。'.repeat(120) }),
    })

    expect(result.final_text).toBe('修订正文带来新的追捕令。'.repeat(120))
    expect(reviewCalls).toBe(3)
    expect(result.decision).toMatchObject({ passed: false, approvable: true, hard_failures: [] })
    expect(result.decision.advisory_failures.join('｜')).toContain('quality_recheck_unavailable')
    expect(result.quality_warning?.details?.diagnostics?.review_attempts).toHaveLength(2)
  })

  test('does not persist model-controlled values or arbitrary keys in invalid review diagnostics', async () => {
    const leakSentinel = 'MODEL_CONTROLLED_PREVIEW_SENTINEL'
    let reviewCalls = 0
    const result = await runProseQualityLoop({
      initialText: '初稿问题。'.repeat(120),
      minScore: 78,
      coreContract: { chapter_no: 10 },
      scan: () => ({ hard_failures: [] }),
      review: async ({ round }) => {
        reviewCalls += 1
        if (round === 0) {
          return {
            score: 70,
            dimensions: sixDimensionScores,
            findings: [{
              key: 'hook',
              severity: 'S2',
              dimension: 'payoff_hook',
              evidence: '初稿问题。',
              required_change: '补章末问题',
              acceptance_test: '末段形成翻页理由',
            }],
          }
        }
        return {
          score: null,
          score_scale: leakSentinel,
          dimensions: { [leakSentinel]: 1 },
          findings: [],
          __quality_review_transport: {
            finish_reason: leakSentinel,
            usage: {
              input_tokens: 12,
              output_tokens: leakSentinel,
              [leakSentinel]: leakSentinel,
            },
            content_length: 345,
            raw_keys: [leakSentinel],
          },
          [leakSentinel]: leakSentinel,
        }
      },
      revise: async () => ({ final_text: '修订正文带来新的追捕令。'.repeat(120) }),
    })

    expect(reviewCalls).toBe(3)
    expect(JSON.stringify(result)).not.toContain(leakSentinel)
    expect(result.decision).toMatchObject({ passed: false, approvable: true, hard_failures: [] })
    expect(result.quality_warning?.details?.diagnostics?.review_attempts?.[0]).toMatchObject({
      field_types: {
        score: 'null',
        score_scale: 'string',
        dimensions: 'object',
        findings: 'array',
        publishable: 'missing',
      },
      transport: {
        finish_reason: 'unknown',
        usage: { input_tokens: 12 },
        content_length: 345,
      },
    })
    expect(result.quality_warning?.details?.diagnostics?.review_attempts?.[0]).not.toHaveProperty(leakSentinel)
  })

  test('treats an ambiguous five-point recheck score as unavailable', async () => {
    let reviewCalls = 0
    const result = await runProseQualityLoop({
      initialText: '初稿问题。'.repeat(120),
      minScore: 85,
      coreContract: { chapter_no: 10 },
      scan: () => ({ hard_failures: [] }),
      review: async () => {
        reviewCalls += 1
        return reviewCalls === 1
          ? {
              score: 70,
              dimensions: sixDimensionScores,
              findings: [{
                key: 'style',
                severity: 'S2',
                dimension: 'prose_style',
                evidence: '初稿问题。',
                required_change: '修改句子',
                acceptance_test: '原句消失',
              }],
            }
          : { score: 4.8, dimensions: sixDimensionScores, publishable: true, findings: [] }
      },
      revise: async () => ({ final_text: '修订正文。'.repeat(120) }),
    })
    expect(result.decision).toMatchObject({ passed: false, approvable: true, hard_failures: [] })
    expect(result.decision.advisory_failures.join('｜')).toContain('quality_recheck_unavailable')
  })

  test('returns an advisory fallback for an unusable initial six-dimension review', async () => {
    const initialText = '初稿。'.repeat(120)
    const scan = { hard_failures: [{ key: 'existing_scan_result', message: '保留扫描结果' }] }
    const result = await runProseQualityLoop({
      initialText,
      minScore: 78,
      scan: () => scan,
      review: async () => ({ score: 90, findings: [] }),
      revise: async () => ({ final_text: '不会调用。' }),
    })

    expect(result).toMatchObject({
      final_text: initialText,
      final_scan: scan,
      final_review: {
        score: 0,
        publishable: false,
        dimensions: {},
        blocking_findings: [],
        advisory_findings: [],
      },
      decision: {
        passed: false,
        approvable: false,
        score: 0,
        min_score: 78,
        hard_failures: [{ key: 'existing_scan_result', message: '保留扫描结果', source: 'deterministic' }],
      },
      rounds: [],
      quality_warning: { code: 'quality_review_unavailable', source: 'review' },
    })
    expect(result.decision.advisory_failures.join('｜')).toContain('quality_review_unavailable')
    expect(result.quality_warning?.details?.diagnostics).toMatchObject({
      kind: 'invalid_payload',
      review_attempts: [{ attempt: 1 }, { attempt: 2 }],
    })

    const callbackFailure = await runProseQualityLoop({
      initialText,
      minScore: 78,
      scan: () => ({ hard_failures: [] }),
      review: async () => { throw new Error('MODEL_PROVIDER_SENTINEL') },
      revise: async () => ({ final_text: '不会调用。' }),
    })
    expect(callbackFailure).toMatchObject({
      final_text: initialText,
      decision: { passed: false, approvable: true, hard_failures: [] },
      quality_warning: { code: 'quality_review_unavailable', source: 'review' },
    })
    expect(JSON.stringify(callbackFailure)).not.toContain('MODEL_PROVIDER_SENTINEL')
    expect(callbackFailure.quality_warning?.details?.diagnostics).toMatchObject({
      kind: 'callback_error',
      field_types: { name: 'string', message: 'string', code: 'missing' },
    })
  })

  test('builds focused review and revision prompts around prose evidence', () => {
    const reviewPrompt = buildFocusedProseReviewPrompt({
      coreContract: { chapter_no: 10, reader_promise: '行动破局' },
      chapterText: 'CHAPTER_TEXT_SENTINEL',
      deterministicScan: { hard_failures: [{ key: 'meta', message: '工程词' }] },
    })
    const revisionPrompt = buildFocusedProseRevisionPrompt({
      coreContract: { chapter_no: 10, reader_promise: '行动破局' },
      chapterText: 'CHAPTER_TEXT_SENTINEL',
      round: 1,
      blockingFindings: Array.from({ length: 8 }, (_, index) => ({
        key: `finding_${index}`,
        severity: 'S2' as const,
        dimension: 'conflict_causality' as const,
        evidence: `EVIDENCE_${index}`,
        required_change: `CHANGE_${index}`,
        acceptance_test: `TEST_${index}`,
      })),
    })

    expect(reviewPrompt).toContain('continuity')
    expect(reviewPrompt).toContain('fact_setting_safety')
    expect(reviewPrompt).toContain('总体分 score 必须使用 0-100 分制')
    expect(reviewPrompt).toContain('score_scale')
    expect(reviewPrompt).toContain('六个维度分别使用 0-10 分制')
    expect(reviewPrompt).toContain('CHAPTER_TEXT_SENTINEL')
    expect(revisionPrompt).toContain('EVIDENCE_0')
    expect(revisionPrompt).toContain('EVIDENCE_5')
    expect(revisionPrompt).not.toContain('EVIDENCE_6')
    expect(revisionPrompt).toContain('完整章节正文')
    expect(revisionPrompt).toContain('对修订后全文重新扫描')
    expect(revisionPrompt).toContain('不得新增小写英文粘连词')
    expect(revisionPrompt).toContain('微微鼓胀')
    expect(revisionPrompt).toContain('没有一丝多余')
    expect(revisionPrompt).toContain('犹如实质的毒液')
  })
})
