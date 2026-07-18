import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import {
  buildDeliveryRiskRevisionClosurePlan,
  buildRepairTaskRevisionPrompt,
  listQualityContractRequiredFields,
  listQualityContractRequiredFieldKeys,
} from './repairTaskRevisionPrompt'

describe('buildRepairTaskRevisionPrompt contracts/rewrite-closure', () => {
  test('uses a targeted opening rewrite when previous chapter handoff is missed', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'review_annotation_risk',
      issue_type: 'reader_expectation_debt',
      severity: 'medium',
      source_label: '读者期待',
      annotation_category: 'reader_expectation',
      annotation_key: 'reader_expectation_sync:303:3:3:reader_expectation_debt:期待欠账 1',
      message: '上一章承接没有兑现：湿漉漉学生敲响玻璃门。',
      action: '补齐读者期待账本中的必兑现项。',
      payload: {
        status: 'warn',
        missed: [
          {
            key: 'opening_handoff',
            label: '上一章承接',
            text: '上一章最后一幕：湿漉漉学生敲响玻璃门，林晓警告不能开门。',
            match_scope: 'opening',
          },
        ],
      },
    })

    expect(prompt).toContain('【开篇承接修复】')
    expect(prompt).toContain('重写或补写本章前 300-500 字')
    expect(prompt).toContain('上一章最后一幕：湿漉漉学生敲响玻璃门')
    expect(prompt).toContain('开篇先写角色对上一章钩子、危机、欠账或未解问题的直接反应')
    expect(prompt).toContain('不得从泛环境描写、空泛醒来或无关解释重新开场')
  })

  test('uses a targeted opening rewrite for safe-batch chapter handoff repair tasks', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'chapter_handoff_missed',
      severity: 'medium',
      message: '章节交接漏接 1 项，开篇没有接住上一章悬念。',
      action: '重修本章开篇300字和第一场景。',
      chapter_handoff_review: {
        status: 'warn',
        missed_count: 1,
        missed: [
          {
            key: 'opening_handoff',
            label: '上一章承接',
            text: '阵盘第二道裂纹必须在开篇造成可见压力。',
            match_scope: 'opening',
          },
        ],
      },
    })

    expect(prompt).toContain('【开篇承接修复】')
    expect(prompt).toContain('重写或补写本章前 300-500 字')
    expect(prompt).toContain('阵盘第二道裂纹必须在开篇造成可见压力')
    expect(prompt).toContain('不得把上一章钩子拖到中后段才提一句')
    expect(prompt).toContain('输出要求：必须返回 chapter_handoff_checks')
    expect(prompt).toContain('chapter_handoff_checks 每项必须包含 key, label, status, previous_handoff, opening_obligation, opening_evidence, location, continuity_action, remaining_risk')
    expect(prompt).toContain('前300-500字没有接住上一章钩子、危机、欠账或未解问题时 status 不能写 pass/ok')
    expect(prompt).toContain('chapter_handoff_checks')
    expect(prompt).toContain('previous_handoff、opening_obligations、must_deliver、keep_alive 和 overdue')
  })

  test('uses a targeted ending page-turn rewrite when ending hook score is weak', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'review_annotation_risk',
      issue_type: 'ending_page_turn_risk',
      severity: 'medium',
      source_label: '可读性/网感',
      annotation_category: 'readability',
      annotation_key: 'readability:203:10:10:ending_page_turn_risk:章末翻页弱 55',
      message: '最后 300 字翻页评分 55，需要把章末问题压成下一章非看不可。',
      action: '重写最后300字，把危险升级、选择压力、反转或未解答案压到最后一幕。',
      payload: {
        readability_score: 83,
        opening_hook_score: 82,
        ending_hook_score: 55,
        scene_readability_score: 80,
        meme_sense: { intensity: '轻度', immersion_risks: [] },
      },
    })

    expect(prompt).toContain('【章末翻页修复】')
    expect(prompt).toContain('章末评分：55')
    expect(prompt).toContain('最后 300 字')
    expect(prompt).toContain('下一章非看不可')
    expect(prompt).toContain('不得用总结、说明或情绪收束代替章末钩子')
  })

  test('uses a targeted scene progression rewrite when scene readability score is weak', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'review_annotation_risk',
      issue_type: 'scene_progression_risk',
      severity: 'medium',
      source_label: '可读性/网感',
      annotation_category: 'readability',
      annotation_key: 'readability:203:10:10:scene_progression_risk:场景推进弱 58',
      message: '场景推进评分 58，场景目标、阻碍、转折、回报不够清楚。',
      action: '补齐每个场景的目标、阻碍、转折、回报。',
      payload: {
        readability_score: 82,
        opening_hook_score: 82,
        ending_hook_score: 82,
        scene_readability_score: 58,
        payoff_density_score: 80,
      },
    })

    expect(prompt).toContain('【场景推进修复】')
    expect(prompt).toContain('场景评分：58')
    expect(prompt).toContain('目标、阻碍、转折、回报')
    expect(prompt).toContain('不得只补说明文字')
  })

  test('uses a targeted payoff density rewrite when payoff density score is weak', () => {
    const prompt = buildRepairTaskRevisionPrompt({
      source: 'review_annotation_risk',
      issue_type: 'payoff_density_risk',
      severity: 'medium',
      source_label: '可读性/网感',
      annotation_category: 'readability',
      annotation_key: 'readability:203:10:10:payoff_density_risk:爽点密度弱 56',
      message: '爽点密度评分 56，每 800-1200 字的信息增量或回报不足。',
      action: '补齐信息推进、能力展示、危机反制、关系变化或小回收。',
      payload: {
        readability_score: 82,
        opening_hook_score: 82,
        ending_hook_score: 82,
        scene_readability_score: 82,
        payoff_density_score: 56,
      },
    })

    expect(prompt).toContain('【爽点密度修复】')
    expect(prompt).toContain('爽点密度评分：56')
    expect(prompt).toContain('800-1200 字')
    expect(prompt).toContain('信息推进、能力展示、危机反制、关系变化或小回收')
  })

  test('builds an automatic closure plan only when delivery risk revision clears after recheck', () => {
    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        annotation_key: 'reader_payoff_sync:202:9:9:reader_payoff_debt:回报欠账 1',
      },
      {
        quality_refresh: { ok: true, score: 82 },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.annotationKey).toBe('reader_payoff_sync:202:9:9:reader_payoff_debt:回报欠账 1')
    expect(cleared.note).toContain('自动复检通过')
    expect(cleared.note).toContain('风险已清零')

    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        annotation_key: 'storyline_sync:203:10:10:storyline_sync_risk:剧情线风险 2',
      },
      {
        quality_refresh: { ok: true, score: 80 },
        delivery_risk_convergence: { status: 'residual', residual_count: 2, label: '仍有残留 2' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('仍有残留 2')

    const failedQuality = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        annotation_key: 'readability_review:301:12:12:readability_or_meme_risk:可读性风险 1',
      },
      {
        quality_refresh: { ok: false, error: '模型未返回质检' },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(failedQuality.taskStatus).toBe('needs_review')
    expect(failedQuality.annotationStatus).toBe('')
    expect(failedQuality.note).toContain('自动复检未通过')
  })

  test('closes oh-story post batch quality repair only when all warning checks clear', () => {
    const task = {
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'post_batch_quality_warning',
      message: 'oh-story 批次交稿后质检仍有 2 项未闭环。',
      post_batch_quality_check: {
        status: 'warn',
        chapter_nos: [8, 9, 10],
        checks: [
          { key: 'prose_meta', label: '正文元信息', status: 'warn', warn_count: 1 },
          { key: 'foreshadowing_delta', label: '伏笔增量', status: 'warn', warn_count: 1 },
        ],
      },
    }

    const cleared = buildDeliveryRiskRevisionClosurePlan(task, {
      quality_refresh: { ok: true, score: 86 },
      post_batch_quality_check: {
        status: 'ok',
        checks: [
          { key: 'prose_meta', label: '正文元信息', status: 'ok', warn_count: 0 },
          { key: 'foreshadowing_delta', label: '伏笔增量', status: 'ok', warn_count: 0 },
        ],
      },
    })

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('')
    expect(cleared.annotationKey).toBe('')
    expect(cleared.note).toContain('post_batch_quality_check')
    expect(cleared.note).toContain('已清零')

    const residual = buildDeliveryRiskRevisionClosurePlan(task, {
      quality_refresh: { ok: true, score: 83 },
      post_batch_quality_check: {
        status: 'warn',
        checks: [
          { key: 'prose_meta', label: '正文元信息', status: 'warn', warn_count: 1, summaries: ['第9章仍残留作者说明'] },
          { key: 'foreshadowing_delta', label: '伏笔增量', status: 'ok', warn_count: 0 },
        ],
      },
    })

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('正文元信息')
    expect(residual.note).toContain('第9章仍残留作者说明')

    const missingChecks = buildDeliveryRiskRevisionClosurePlan(task, {
      quality_refresh: { ok: true, score: 87 },
      post_batch_quality_check: {
        status: 'ok',
      },
    })

    expect(missingChecks.taskStatus).toBe('needs_review')
    expect(missingChecks.note).toContain('post_batch_quality_check.checks 未返回')

    const failedQuality = buildDeliveryRiskRevisionClosurePlan(task, {
      quality_refresh: { ok: false, error: '模型未返回质检' },
      post_batch_quality_check: {
        status: 'ok',
        checks: [
          { key: 'prose_meta', label: '正文元信息', status: 'ok', warn_count: 0 },
          { key: 'foreshadowing_delta', label: '伏笔增量', status: 'ok', warn_count: 0 },
        ],
      },
    })

    expect(failedQuality.taskStatus).toBe('needs_review')
    expect(failedQuality.annotationStatus).toBe('')
    expect(failedQuality.note).toContain('自动复检未通过')
  })

  test('keeps unattended post-delivery repair tasks open until Step 3 recheck clears', () => {
    const task = {
      source: 'unattended_post_delivery_quality',
      issue_type: 'prose_meta_gap',
      annotation_category: 'prose_meta',
      chapter_no: 9,
      post_delivery_quality: {
        source: 'oh_story_step_3',
        status: 'warn',
        check: {
          key: 'prose_meta',
          label: '正文元信息',
          status: 'warn',
          summary: '第9章仍残留作者说明。',
          warn_count: 1,
        },
      },
    }

    const residual = buildDeliveryRiskRevisionClosurePlan(task, {
      quality_refresh: {
        ok: true,
        score: 88,
        review: {
          prose_meta_checks: [],
        },
      },
      post_delivery_quality: {
        status: 'warn',
        checks: [
          { key: 'prose_meta', label: '正文元信息', status: 'warn', warn_count: 1, summary: '第9章仍残留作者说明。' },
        ],
      },
    })

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('单章交付后质检仍未闭环')
    expect(residual.note).toContain('正文元信息')

    const otherStep3Residual = buildDeliveryRiskRevisionClosurePlan(task, {
      quality_refresh: {
        ok: true,
        score: 90,
        review: {
          prose_meta_checks: [],
        },
      },
      post_delivery_quality: {
        status: 'ok',
        checks: [
          { key: 'prose_meta', label: '正文元信息', status: 'ok', warn_count: 0, unknown_count: 0 },
          { key: 'chapter_hook', label: '章尾钩子', status: 'warn', warn_count: 1, summary: '章尾没有形成下一章选择或危险。' },
        ],
      },
    })

    expect(otherStep3Residual.taskStatus).toBe('needs_review')
    expect(otherStep3Residual.note).toContain('单章交付后质检仍未闭环')
    expect(otherStep3Residual.note).toContain('章尾钩子')

    const missingChecks = buildDeliveryRiskRevisionClosurePlan(task, {
      quality_refresh: {
        ok: true,
        score: 92,
        review: {
          prose_meta_checks: [],
        },
      },
      post_delivery_quality: {
        status: 'ok',
      },
    })

    expect(missingChecks.taskStatus).toBe('needs_review')
    expect(missingChecks.note).toContain('post_delivery_quality.checks 未返回')

    const cleared = buildDeliveryRiskRevisionClosurePlan(task, {
      quality_refresh: {
        ok: true,
        score: 91,
        review: {
          prose_meta_checks: [],
        },
      },
      post_delivery_quality: {
        status: 'ok',
        checks: [
          { key: 'prose_meta', label: '正文元信息', status: 'ok', warn_count: 0, unknown_count: 0 },
        ],
      },
    })

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('')
    expect(cleared.note).toContain('单章交付后质检复检通过')
    expect(cleared.note).toContain('post_delivery_quality')
  })

})
