import { describe, expect, mock, test } from 'bun:test'

const runtimeRequests: any[] = []

mock.module('./provider-runtime', () => ({
  executeWithRuntimeModel: mock(async (_workspace: string, request: any) => {
    runtimeRequests.push(request)
    const userPrompt = String(request.messages?.find((item: any) => item.role === 'user')?.content || '')

    if (userPrompt.includes('请构建完整的故事大纲')) {
      return {
        content: JSON.stringify({
          master_outline: { title: '总纲', summary: '主线', hook: '悬念' },
          volume_outlines: [],
          chapter_outlines: [
            { chapter_no: 1, title: '起章', summary: '开局', conflict: '阻力', ending_hook: '钩子' },
          ],
          foreshadowing_plan: [],
        }),
      }
    }

    if (userPrompt.includes('将粗略章纲扩写为场景级别的详细细纲')) {
      return {
        content: JSON.stringify({
          detail_chapters: [
            {
              chapter_no: 1,
              title: '起章',
              summary: '开局',
              conflict: '阻力',
              scenes: [],
              ending_hook: '钩子',
            },
          ],
        }),
      }
    }

    if (userPrompt.includes('连续性')) {
      return { content: JSON.stringify({ continuity_issues: [], is_ready_for_prose: true }) }
    }

    if (userPrompt.includes('角色')) {
      return { content: JSON.stringify({ characters: [] }) }
    }

    if (userPrompt.includes('世界')) {
      return { content: JSON.stringify({ world_summary: '世界', rules: [] }) }
    }

    return { content: JSON.stringify({ preferred_hook: '钩子', genre: '玄幻' }) }
  }),
}))

mock.module('../memory-service', () => ({
  buildMemoryInjectionForProject: mock(async () => ({ text: '' })),
  initMemoryPalace: mock(async () => {}),
  storeAgentOutputForProject: mock(async () => {}),
  verifyAndStoreAgentOutputForProject: mock(async () => ({})),
}))

mock.module('../knowledge-base', () => ({
  queryKnowledge: mock(async () => []),
}))

describe('executeNovelAgentChain outline params', () => {
  test('passes chapter count and user outline into the outline prompt', async () => {
    runtimeRequests.length = 0
    const { executeNovelAgentChain } = await import('./executor')

    await executeNovelAgentChain(
      {
        id: 101,
        title: '参数传递测试',
        genre: '玄幻',
        style_tags: ['爽文'],
        reference_config: {},
      } as any,
      '请基于用户提供的大纲，扩展生成完整的故事大纲和细纲。',
      'test-workspace',
      1,
      ['market-agent', 'world-agent', 'character-agent', 'outline-agent', 'detail-outline-agent', 'continuity-check-agent'],
      {
        chapterCount: 7,
        userOutline: '主角从破庙拿到账本，七章内完成第一次反击。',
        continueFrom: 3,
        existingChapters: [
          { chapter_no: 3, title: '旧钩子', chapter_summary: '账本线索出现', ending_hook: '门外有人敲门' },
        ],
      },
    )

    const outlineRequest = runtimeRequests.find((request) => {
      const userPrompt = String(request.messages?.find((item: any) => item.role === 'user')?.content || '')
      return userPrompt.includes('请构建完整的故事大纲')
    })
    const outlinePrompt = String(outlineRequest?.messages?.find((item: any) => item.role === 'user')?.content || '')

    expect(outlinePrompt).toContain('请生成恰好 7 章的粗略章纲')
    expect(outlinePrompt).toContain('主角从破庙拿到账本')
    expect(outlinePrompt).toContain('前 3 章已经存在')
    expect(outlinePrompt).toContain('第 4 章开始继续生成')
  })
})
