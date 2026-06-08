import { describe, expect, test } from 'bun:test'
import { buildRepairTaskRevisionPrompt } from './repairTaskRevisionPrompt'

describe('buildRepairTaskRevisionPrompt', () => {
  test('injects batch brief context for batch plan mismatch repairs', () => {
    const prompt = buildRepairTaskRevisionPrompt(
      {
        issue_type: 'batch_brief_mismatch',
        segment: '第8-10章',
        message: '本章有 2 项批次任务书兑现风险',
        action: '对照下一批任务书重修本章职责、读者回报、主线焦点和禁抢跑边界。',
        chapter_no: 9,
        acceptance_criteria: ['补齐阵盘反噬回报', '不能提前揭露规则源头'],
        batch_plan_context: {
          batch_goal: '三章内进入内门视野。',
          reader_payoff_plan: '升级、打脸、规则反制逐章交付。',
          mainline_focus: '外门危机 -> 内门招揽',
          forbidden_boundary: '第10章前不得揭露规则源头。',
          chapter_plan: {
            chapter_no: 9,
            title: '阵盘裂纹',
            chapter_task: '兑现阵盘反噬回报。',
            conflict: '阵盘裂纹导致规则反噬。',
            ending_hook: '内门长老注意到主角。',
            mainline_progress: '主角进入内门候选名单。',
          },
        },
      },
      {
        input_ref: JSON.stringify({
          next_batch_brief: {
            batchGoal: '旧字段也能兼容',
          },
        }),
      },
    )

    expect(prompt).toContain('【批次任务书兑现】')
    expect(prompt).toContain('本批目标：三章内进入内门视野。')
    expect(prompt).toContain('读者回报：升级、打脸、规则反制逐章交付。')
    expect(prompt).toContain('主线焦点：外门危机 -> 内门招揽')
    expect(prompt).toContain('禁抢跑边界：第10章前不得揭露规则源头。')
    expect(prompt).toContain('本章职责：兑现阵盘反噬回报。')
    expect(prompt).toContain('本章冲突：阵盘裂纹导致规则反噬。')
    expect(prompt).toContain('章末钩子：内门长老注意到主角。')
    expect(prompt).toContain('补齐阵盘反噬回报；不能提前揭露规则源头')
  })

  test('falls back to run input next batch brief when task lacks embedded context', () => {
    const prompt = buildRepairTaskRevisionPrompt(
      {
        issue_type: 'batch_brief_mismatch',
        message: '漏掉本批主线推进',
        chapter_no: 10,
      },
      {
        input_ref: JSON.stringify({
          next_batch_brief: {
            batchGoal: '第一轮规则试探闭环。',
            readerPayoffPlan: '每章交付一条可验证规则。',
            mainlineFocus: '宿舍规则 -> 夜巡规则',
            forbiddenBoundary: '不得揭露规则源头。',
            chapters: [
              { chapterNo: 10, title: '夜巡脚步', chapterTask: '证明夜巡规则有效。', endingHook: '宿管敲门。' },
            ],
          },
        }),
      },
    )

    expect(prompt).toContain('本批目标：第一轮规则试探闭环。')
    expect(prompt).toContain('本章职责：证明夜巡规则有效。')
    expect(prompt).toContain('章末钩子：宿管敲门。')
  })
})
