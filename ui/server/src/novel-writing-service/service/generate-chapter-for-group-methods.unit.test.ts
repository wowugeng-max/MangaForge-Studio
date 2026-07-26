import { describe, expect, test } from 'bun:test'
import { createNovelWritingService } from './create-novel-writing-service'
import { createProsePipelineHarness } from '../../routes/novel-writing-service.test-support'

// The default harness draft is in range for the custom 1000-char target but has zero dialogue
// paragraphs, so the dialogue-texture floor would force word-target expansion unless the
// zhuque_fast expand:false lock actually reaches ensureProseMeetsWordTarget.
async function createExpansionCountingHarness() {
  const expansionTasks: string[] = []
  const harness = await createProsePipelineHarness((ctx: any) => {
    const innerExecuteAgent = ctx.runtime.executeAgent
    ctx.runtime.executeAgent = async (agent: string, project: any, input: any, opts: any) => {
      const task = String(input?.task || '')
      if (task.includes('任务：将本章正文扩写')) expansionTasks.push(task)
      return innerExecuteAgent(agent, project, input, opts)
    }
    return createNovelWritingService(ctx)
  }, {})
  return { harness, expansionTasks }
}

describe('generateChapterForGroup zhuque_fast llm control options', () => {
  test('zhuque_fast skips the word-target expand LLM even when the caller passes raw options', async () => {
    const { harness, expansionTasks } = await createExpansionCountingHarness()

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
      production_mode: 'zhuque_fast',
    })

    expect(result).toBeTruthy()
    expect(expansionTasks.length).toBe(0)
  })

  test('default production mode still runs word-target expansion for dialogue-poor drafts', async () => {
    const { harness, expansionTasks } = await createExpansionCountingHarness()

    const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
      model_id: 217,
    })

    expect(result).toBeTruthy()
    expect(expansionTasks.length).toBeGreaterThan(0)
  })
})
