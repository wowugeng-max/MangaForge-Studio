import { afterEach, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  createNovelChapter,
  createNovelProject,
  listNovelChapters,
  listNovelOutlines,
} from '../novel'

let workspaces: string[] = []

async function tempWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-planning-route-test-'))
  workspaces.push(workspace)
  return workspace
}

afterEach(async () => {
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
})

describe('novel rolling planning routes', () => {
  test('rolling plan prompt preserves batch brief repair intent', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-planning-routes.ts'), 'utf8')

    expect(source).toContain('const rollingPlanIntent = req.body.rolling_plan_intent || req.body.rollingPlanIntent || null')
    expect(source).toContain('【滚动规划意图】')
    expect(source).toContain('batch_brief_repair')
    expect(source).toContain('缺逐章职责、冲突落点、主线推进或章末钩子')
    expect(source).toContain('rolling_plan_intent: rollingPlanIntent')
  })

  test('rolling plan prompt preserves recent fatigue repair intent', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-planning-routes.ts'), 'utf8')

    expect(source).toContain("rollingPlanIntent?.source === 'recent_fatigue_repair'")
    expect(source).toContain('本次是近10章疲劳修复')
    expect(source).toContain('更换冲突来源')
    expect(source).toContain('更换回报/爽点形态')
    expect(source).toContain('更换章末追读问题')
    expect(source).toContain('更换标志性场面')
    expect(source).toContain('不得改变主线方向、长期设定和已确认剧情线')
  })

  test('rolling plan prompt turns IP scene coverage gaps into concrete scene repair obligations', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-planning-routes.ts'), 'utf8')

    expect(source).toContain('IP场面覆盖')
    expect(source).toContain('标志性场面补位')
    expect(source).toContain('补位章节')
    expect(source).toContain('本章要补的标志性场面')
    expect(source).toContain('服务的主线推进或爽点回报')
    expect(source).toContain('不能只写“增加场面新鲜度”')
  })

  test('rolling plan writes generated chapters into chapter outlines', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-planning-routes.ts'), 'utf8')

    expect(source).toContain('function normalizeRollingPlanPayload')
    expect(source).toContain('function rollingPlanOutlineData')
    expect(source).toContain('async function applyRollingPlanOutlines')
    expect(source).toContain("source: 'rolling_plan'")
    expect(source).toContain('rollingPlan: item')
    expect(source).toContain('write_rolling_outlines')
    expect(source).toContain('written_outline_ids')
    expect(source).toContain('written_chapter_ids')
    expect(source).toContain('chapter_write_summary')
  })

  test('rolling plan writes writable chapter placeholders without clearing existing prose', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '超长篇流水线测试' })
    await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 8,
      title: '旧第8章',
      chapter_text: '已经写好的正文不能被规划覆盖。',
      chapter_goal: '旧目标',
    })

    const routeModule = await import('./novel-planning-routes')
    const applyRollingPlanOutlines = (routeModule as any).__testExports?.applyRollingPlanOutlines
    const result = typeof applyRollingPlanOutlines === 'function'
      ? await applyRollingPlanOutlines(workspace, project, await listNovelOutlines(workspace, project.id), [
          {
            chapter_no: 8,
            title: '伏笔回压',
            chapter_goal: '把第七章遗留危机压到主角眼前。',
            conflict: '主角必须在不暴露底牌的情况下过关。',
            payoff: '读者看到主角用新方法破解旧规则。',
            ending_hook: '门后传来熟人的声音。',
          },
          {
            chapter_no: 9,
            title: '新压力源',
            chapter_goal: '引入下一轮敌对势力的可见压迫。',
            conflict: '安全区被迫变成临时战场。',
            payoff: '主角获得一个能改变局势的小道具。',
            signature_scene: '主角在倒塌走廊里反手点亮禁用阵纹，把安全区变成审判场。',
            scene_repair_target: '修复 IP场面覆盖 1/10 的强场面空窗。',
            storyline_service: '推进外门试炼主线，并兑现规则反杀爽点。',
            ending_hook: '道具背面刻着禁用标记。',
          },
        ], { source: 'recent_fatigue_repair' })
      : { writtenChapters: [], chapterWriteSummary: { created: 0, updated: 0, skipped: 2 } }

    const chapters = await listNovelChapters(workspace, project.id)

    expect(result.writtenChapters.map((chapter: any) => chapter.chapter_no)).toEqual([8, 9])
    expect(result.chapterWriteSummary).toMatchObject({ created: 1, updated: 1, skipped: 0 })
    expect(chapters).toHaveLength(2)
    expect(chapters[0].chapter_no).toBe(8)
    expect(chapters[0].title).toBe('伏笔回压')
    expect(chapters[0].chapter_text).toBe('已经写好的正文不能被规划覆盖。')
    expect(chapters[0].raw_payload.source).toBe('rolling_plan')
    expect(chapters[1].chapter_no).toBe(9)
    expect(chapters[1].chapter_goal).toBe('引入下一轮敌对势力的可见压迫。')
    expect(chapters[1].chapter_summary).toContain('主角在倒塌走廊里反手点亮禁用阵纹')
    expect(chapters[1].raw_payload.rollingPlan.signature_scene).toContain('审判场')
    expect(chapters[1].raw_payload.rollingPlan.scene_repair_target).toContain('IP场面覆盖 1/10')
    expect(chapters[1].raw_payload.rollingPlan.storyline_service).toContain('规则反杀爽点')
    expect(chapters[1].raw_payload.rolling_plan_intent).toEqual({ source: 'recent_fatigue_repair' })
  })
})
