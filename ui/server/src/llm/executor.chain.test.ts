import { describe, expect, mock, test } from 'bun:test'

const runtimeRequests: any[] = []
const memoryRecallCalls: any[][] = []
const memoryStoreCalls: any[][] = []
const verifiedMemoryStoreCalls: any[][] = []

mock.module('./provider-runtime', () => ({
  executeWithRuntimeModel: mock(async (_workspace: string, request: any) => {
    runtimeRequests.push(request)
    const userPrompt = String(request.messages?.find((item: any) => item.role === 'user')?.content || '')

    if (userPrompt.includes('RETRY_EMPTY_PROSE_TEST')) {
      const attempt = runtimeRequests.filter((item) => {
        const prompt = String(item.messages?.find((message: any) => message.role === 'user')?.content || '')
        return prompt.includes('RETRY_EMPTY_PROSE_TEST')
      }).length
      if (attempt === 1) {
        return {
          content: '',
          finish_reason: 'stop',
          usage: {
            input_tokens: 250000,
            output_tokens: 9000,
            total_tokens: 259000,
          },
          raw: {
            stream_chunks_tail: [
              {
                choices: [{ delta: {}, finish_reason: 'stop', index: 0 }],
                usage: {
                  completion_tokens: 9000,
                  completion_tokens_details: {
                    output_text_tokens: 0,
                    reasoning_tokens: 9000,
                  },
                },
              },
            ],
          },
        }
      }
      return {
        content: JSON.stringify({
          prose_chapters: [
            {
              chapter_no: 10,
              title: '空输出重试',
              chapter_text: '第二次请求直接写出了正文。',
              scene_breakdown: [],
              continuity_notes: [],
            },
          ],
        }),
      }
    }

    if (userPrompt.includes('BOUNDED_PARAGRAPH_TASK_WITH_OH_STORY_RULES')) {
      return {
        content: JSON.stringify({
          prose_chapters: [{ chapter_no: 10, title: '暗门', chapter_text: '正文。' }],
        }),
        usage: { input_tokens: 3210, output_tokens: 987, total_tokens: 4197 },
      }
    }

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
  buildMemoryInjectionForProject: mock(async (...args: any[]) => {
    memoryRecallCalls.push(args)
    return { text: 'RECALLED_CHAPTER_MEMORY' }
  }),
  initMemoryPalace: mock(async () => {}),
  storeAgentOutputForProject: mock(async (...args: any[]) => {
    memoryStoreCalls.push(args)
  }),
  verifyAndStoreAgentOutputForProject: mock(async (...args: any[]) => {
    verifiedMemoryStoreCalls.push(args)
    return {}
  }),
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

  test('keeps prose paragraph task bounded without duplicating full upstream context into agent messages', async () => {
    runtimeRequests.length = 0
    const { generateNovelChapterProse } = await import('./executor')

    const result = await generateNovelChapterProse(
      {
        id: 102,
        title: '正文瘦身测试',
        genre: '都市',
        style_tags: ['网文'],
        reference_config: {},
      } as any,
      {
        chapter_no: 10,
        title: '暗门',
        chapter_summary: '主角追进旧楼，发现证据被提前转移。',
        conflict: '追查与阻拦',
        ending_hook: '门后传来熟人的声音',
      },
      {
        worldbuilding: { world_summary: 'FULL_WORLDBUILDING_SHOULD_NOT_DUPLICATE', rules: ['FULL_RULE_SHOULD_NOT_DUPLICATE'] },
        characters: [{ name: 'FULL_CHARACTER_SHOULD_NOT_DUPLICATE', motivation: '查清真相' }],
        outline: [{ title: 'FULL_OUTLINE_SHOULD_NOT_DUPLICATE', summary: '长线大纲' }],
        prevChapters: [
          {
            chapter_no: 9,
            title: '旧楼之前',
            chapter_summary: '上一章摘要',
            ending_hook: '上一章钩子',
            chapter_text: `FULL_PREVIOUS_CHAPTER_BODY_SHOULD_NOT_DUPLICATE${'中段正文。'.repeat(600)}上一章末尾片段可以保留。`,
          },
        ],
        paragraphTask: 'BOUNDED_PARAGRAPH_TASK_WITH_OH_STORY_RULES',
        boundedProseContract: true,
        promptDiagnostics: {
          prompt_chars: 41_000,
          required_chars: 12_000,
          selected_contract_keys: ['dialogue'],
        },
      } as any,
      { activeWorkspace: 'test-workspace', skipMemory: true, modelId: '1' },
    )

    const proseRequest = runtimeRequests.find((request) => {
      const userPrompt = String(request.messages?.find((item: any) => item.role === 'user')?.content || '')
      return userPrompt.includes('BOUNDED_PARAGRAPH_TASK_WITH_OH_STORY_RULES')
    })
    const combinedPrompt = JSON.stringify(proseRequest?.messages || [])

    expect(proseRequest).toBeTruthy()
    expect(combinedPrompt).toContain('BOUNDED_PARAGRAPH_TASK_WITH_OH_STORY_RULES')
    expect(combinedPrompt).not.toContain('FULL_WORLDBUILDING_SHOULD_NOT_DUPLICATE')
    expect(combinedPrompt).not.toContain('FULL_CHARACTER_SHOULD_NOT_DUPLICATE')
    expect(combinedPrompt).not.toContain('FULL_OUTLINE_SHOULD_NOT_DUPLICATE')
    expect(combinedPrompt).not.toContain('FULL_PREVIOUS_CHAPTER_BODY_SHOULD_NOT_DUPLICATE')
    expect((result as any).prose_prompt_diagnostics).toMatchObject({
      prompt_chars: 41_000,
      required_chars: 12_000,
      selected_contract_keys: ['dialogue'],
      model_usage: { input_tokens: 3210, output_tokens: 987, total_tokens: 4197 },
    })
  })

  test('preserves the authoritative bounded prose prompt over project replacements', async () => {
    runtimeRequests.length = 0
    const { generateNovelChapterProse } = await import('./executor')

    await generateNovelChapterProse(
      {
        id: 107,
        title: '权威正文提示词测试',
        genre: '都市',
        style_tags: ['网文'],
        reference_config: {
          agent_prompt_config: {
            prompts: {
              'prose-agent': {
                system: 'PROJECT_PROSE_SYSTEM_REPLACEMENT_SENTINEL',
                user: 'PROJECT_PROSE_USER_REPLACEMENT_SENTINEL',
              },
            },
          },
        },
      } as any,
      {
        chapter_no: 10,
        title: '暗门',
        chapter_summary: '主角追进旧楼，发现证据被提前转移。',
      },
      {
        paragraphTask: 'BOUNDED_PARAGRAPH_TASK_WITH_OH_STORY_RULES',
        boundedProseContract: true,
      } as any,
      { activeWorkspace: 'test-workspace', skipMemory: true, modelId: '1' },
    )

    const proseRequest = runtimeRequests[0]
    const userPrompt = String(proseRequest?.messages?.find((item: any) => item.role === 'user')?.content || '')
    const combinedPrompt = JSON.stringify(proseRequest?.messages || [])

    expect(userPrompt).toContain('BOUNDED_PARAGRAPH_TASK_WITH_OH_STORY_RULES')
    expect(combinedPrompt).not.toContain('PROJECT_PROSE_SYSTEM_REPLACEMENT_SENTINEL')
    expect(combinedPrompt).not.toContain('PROJECT_PROSE_USER_REPLACEMENT_SENTINEL')
  })

  test('keeps prose memory recall while skipping every candidate draft memory write', async () => {
    runtimeRequests.length = 0
    memoryRecallCalls.length = 0
    memoryStoreCalls.length = 0
    verifiedMemoryStoreCalls.length = 0
    const { generateNovelChapterProse } = await import('./executor')

    await generateNovelChapterProse(
      {
        id: 104,
        title: '正文记忆顺序测试',
        genre: '都市',
        style_tags: ['网文'],
        reference_config: {},
      } as any,
      {
        chapter_no: 10,
        title: '暗门',
        chapter_summary: '主角追进旧楼。',
      },
      {
        paragraphTask: 'BOUNDED_PARAGRAPH_TASK_WITH_OH_STORY_RULES',
        boundedProseContract: true,
      } as any,
      {
        activeWorkspace: 'test-workspace',
        modelId: '1',
        skipMemoryStore: true,
      },
    )

    const proseRequest = runtimeRequests.find((request) => {
      const userPrompt = String(request.messages?.find((item: any) => item.role === 'user')?.content || '')
      return userPrompt.includes('BOUNDED_PARAGRAPH_TASK_WITH_OH_STORY_RULES')
    })

    expect(memoryRecallCalls).toHaveLength(1)
    expect(JSON.stringify(proseRequest?.messages || [])).toContain('RECALLED_CHAPTER_MEMORY')
    expect(memoryStoreCalls).toEqual([])
    expect(verifiedMemoryStoreCalls).toEqual([])
  })

  test('stores the supplied accepted final prose through the verified memory adapter', async () => {
    memoryStoreCalls.length = 0
    verifiedMemoryStoreCalls.length = 0
    const { storeNovelChapterProseMemory } = await import('./executor')
    const finalText = '这是全部门禁通过并已成功入库的最终正文。'

    await storeNovelChapterProseMemory(
      { id: 105, title: '最终正文记忆测试' } as any,
      10,
      finalText,
    )

    expect(memoryStoreCalls).toEqual([])
    expect(verifiedMemoryStoreCalls).toEqual([
      [105, '最终正文记忆测试', 'prose-chapter-10', finalText, 'plot'],
    ])
  })

  test('preserves skipMemory as disabling prose recall and every memory store', async () => {
    runtimeRequests.length = 0
    memoryRecallCalls.length = 0
    memoryStoreCalls.length = 0
    verifiedMemoryStoreCalls.length = 0
    const { generateNovelChapterProse } = await import('./executor')

    await generateNovelChapterProse(
      { id: 106, title: '跳过全部记忆测试', reference_config: {} } as any,
      { chapter_no: 10, title: '暗门' },
      {
        paragraphTask: 'BOUNDED_PARAGRAPH_TASK_WITH_OH_STORY_RULES',
        boundedProseContract: true,
      } as any,
      { activeWorkspace: 'test-workspace', modelId: '1', skipMemory: true },
    )

    expect(memoryRecallCalls).toEqual([])
    expect(memoryStoreCalls).toEqual([])
    expect(verifiedMemoryStoreCalls).toEqual([])
  })

  test('retries prose draft once in direct-output non-stream mode when streaming returns reasoning-only content', async () => {
    runtimeRequests.length = 0
    const { generateNovelChapterProse } = await import('./executor')

    const result = await generateNovelChapterProse(
      {
        id: 103,
        title: '空输出重试测试',
        genre: '都市',
        style_tags: ['网文'],
        reference_config: {},
      } as any,
      {
        chapter_no: 10,
        title: '空输出',
        chapter_summary: '测试 Gemini reasoning-only 空正文重试。',
      },
      {
        paragraphTask: 'RETRY_EMPTY_PROSE_TEST 请生成本章正文。',
        maxTokens: 18000,
      } as any,
      { activeWorkspace: 'test-workspace', skipMemory: true, modelId: '217' },
    )

    const proseRequests = runtimeRequests.filter((request) => {
      const userPrompt = String(request.messages?.find((item: any) => item.role === 'user')?.content || '')
      return userPrompt.includes('RETRY_EMPTY_PROSE_TEST')
    })

    expect(proseRequests).toHaveLength(2)
    expect(proseRequests[0].stream).toBe(true)
    expect(proseRequests[1]).toMatchObject({
      stream: false,
      response_mode: 'non_stream',
    })
    expect(proseRequests[1].max_tokens).toBeGreaterThan(proseRequests[0].max_tokens)
    expect(String(proseRequests[1].messages?.find((item: any) => item.role === 'user')?.content || '')).toContain('不要输出思考过程')
    expect(result.content).toContain('第二次请求直接写出了正文')
  })
})
