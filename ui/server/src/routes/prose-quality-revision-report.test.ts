import { describe, expect, test } from 'bun:test'
import {
  applySurgicalRevisionPatch,
  buildCompactEditorRevisionPrompt,
  buildEditorRevisionPrompt,
  buildProseQualityRevisionReport,
  focusDeliveryRiskBriefForRevision,
} from './novel-editor-routes'

describe('prose quality revision report linkage', () => {
  test('marks progress replay as structural rewrite and drops keep-as-is noise', () => {
    const report = buildProseQualityRevisionReport({
      score: 92,
      needs_revision: true,
      revision_directives: [
        '禁止回放上一章已兑现的餐桌对决；开篇承接十点敲门。',
        '精简弹幕描写',
      ],
      issues: [
        {
          severity: 'high',
          type: 'progress_replay',
          description: '本章仍按旧种子回放同一冲突',
          fix: '禁止回放上一章已兑现的餐桌对决；开篇承接十点敲门。',
        },
        {
          severity: 'info',
          type: 'blueprint_conflict',
          description: '正文选择保留并详细写出了该冲突，处理得非常精彩，此处理符合剧情连贯性，不判定为失误。',
          fix: '无需修改正文此处的剧情',
        },
      ],
      delivery_link: {
        source_count: 2,
        selected: [
          {
            key: 'progress_replay',
            priority: 1,
            severity: 'high',
            label: '进度回放',
            directive: '禁止回放上一章已兑现的餐桌对决；开篇承接十点敲门。',
          },
          {
            key: 'quality_audit',
            priority: 3,
            severity: 'high',
            label: '质量诊断',
            directive: '按质量诊断修复：优先清质量硬伤',
          },
        ],
      },
    })

    expect(report.revision_strategy).toBe('structural_rewrite')
    expect(report.must_fix.join('｜')).toMatch(/禁止回放|十点敲门|质量硬伤/)
    expect(report.must_fix.join('｜')).not.toMatch(/无需修改|处理得非常精彩/)
  })

  test('continuity-only structural prompt uses opening patch instead of full chapter_text', () => {
    const report = buildProseQualityRevisionReport({
      score: 80,
      revision_directives: ['禁止回放上一章餐桌对决'],
      issues: [{ severity: 'high', description: '进度回放', fix: '禁止回放上一章餐桌对决' }],
      delivery_link: {
        selected: [{ key: 'progress_replay', directive: '禁止回放上一章餐桌对决' }],
      },
    })
    expect(report.revision_strategy).toBe('opening_structural_patch')
    const prompt = buildEditorRevisionPrompt({
      project: { title: '测试书' },
      chapter: { chapter_text: '爸爸利爪撕碎。江哲反手耳光。邻居敲门。' },
      contextPackage: {},
      report,
      deliveryRiskBrief: focusDeliveryRiskBriefForRevision({
        risks: [
          { item: '修质量：回放', directive: '禁止回放', priority_label: '优先修质量' },
          { item: '补期待 9', directive: '补期待', priority_label: '优先补期待' },
        ],
        revision_directives: ['禁止回放', '补期待'],
      }, report),
      revisionMode: 'from_report',
    })

    expect(prompt).toContain('opening_structural_patch')
    expect(prompt).toContain('禁止输出完整 chapter_text')
    expect(prompt).toContain('opening_rewrite')
    expect(prompt).toContain('禁止回放')
  })

  test('compact truncated structural retry falls back to opening patch', () => {
    const report = {
      revision_strategy: 'structural_rewrite',
      must_fix: ['禁止回放上一章餐桌对决'],
      one_click_revision_prompt: '禁止回放上一章餐桌对决',
    }
    const prompt = buildCompactEditorRevisionPrompt({
      project: { title: '测试书' },
      chapter: { chapter_text: '原文开篇回放。后面电梯继续。' },
      report,
      revisionMode: 'from_report',
      previousOutputPreview: '{"chapter_text":"',
    })
    expect(prompt).toContain('opening_structural_patch')
    expect(prompt).toContain('禁止输出完整 chapter_text')
    expect(prompt).toContain('opening_rewrite')
  })

  test('applySurgicalRevisionPatch stitches opening_rewrite with keep_from', () => {
    const result = applySurgicalRevisionPatch(
      '电视画面里山本挑战失败。江哲盯着屏幕。\n\n他走进电梯，无脸贴在玻璃上。',
      {
        opening_rewrite: '江哲捏着物业信封，倒计时只剩四分。他推开防盗铁门。',
        keep_from: '他走进电梯',
      },
    )
    expect(result.applied[0]?.type).toBe('opening_rewrite')
    expect(result.chapterText).toContain('物业信封')
    expect(result.chapterText).toContain('他走进电梯，无脸贴在玻璃上。')
    expect(result.chapterText).not.toContain('山本挑战失败')
  })
})
