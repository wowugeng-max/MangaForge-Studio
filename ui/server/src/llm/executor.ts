import type { NovelProjectRecord } from '../novel'
import { buildNovelAgentPlan, topologicalSortAgents } from './agents'
import {
  baseNovelSystemPrompt,
  baseStructuredOutputPrompt,
  buildCharacterPrompt,
  buildChapterPrompt,
  buildContinuityCheckPrompt,
  buildDetailOutlinePrompt,
  buildMarketPrompt,
  buildNovelSeed,
  buildOutlinePrompt,
  buildProsePrompt,
  buildStyleGuardrails,
  buildWorldPrompt,
  buildKnowledgeInjectionPrompt,
} from './prompts'
import { buildNovelStrategy } from './strategy'
import { buildNovelTools } from './tools'
import type { LLMMessage, LLMRequest, LLMResponse } from './types'

// ── Runtime model selection (reads from keys.json + providers.json + models.json) ──
import { executeWithRuntimeModel } from './provider-runtime'
import { loadActiveWorkspace } from '../workspace'

// ── Memory Service — 使用 ForProject 族函数，经过 project_id + project_title 双重校验 ──
import { buildMemoryInjectionForProject, initMemoryPalace, storeAgentOutputForProject, verifyAndStoreAgentOutputForProject } from '../memory-service'

// ── Knowledge Base Service — 全局写作知识库 ──
import { queryKnowledge } from '../knowledge-base'

// ── Knowledge Injection Helper ──

/**
 * Query the knowledge base based on project genre + task type,
 * then build a knowledge injection text to append to the prompt.
 */
async function buildKnowledgeInjectionText(
  project: NovelProjectRecord,
  taskType: string,
): Promise<string> {
  try {
    // Build query from genre, style_tags, and synopsis
    const queryParts: string[] = []
    if (project.genre) queryParts.push(project.genre)
    if (project.style_tags?.length) queryParts.push(...project.style_tags)
    if (project.synopsis) queryParts.push(project.synopsis.slice(0, 200))
    queryParts.push(taskType)

    const query = queryParts.join(' ')
    if (!query) return ''

    const entries = await queryKnowledge(query, { top_k: 8 })
    if (!entries.length) return ''

    return buildKnowledgeInjectionPrompt(
      project.genre || '',
      taskType,
      entries.map(e => ({
        category: e.category,
        title: e.title,
        content: e.content,
        weight: e.weight,
      })),
    )
  } catch (err) {
    console.warn('[knowledge-injection] Failed to build injection:', String(err).slice(0, 200))
    return ''
  }
}

// ── Agent Message Builder ──

function buildAgentMessages(
  agentId: string,
  project: NovelProjectRecord,
  context: Record<string, any>,
) {
  const styleGuardrails = buildStyleGuardrails(project)
  const upstreamContext = context?.upstreamContext
    ? `\n\n前置 Agent 输出（作为参考上下文）：\n${JSON.stringify(context.upstreamContext, null, 2).slice(0, 4000)}`
    : ''

  // 记忆宫殿注入 — 如果上游调用了 buildMemoryInjection，这里把文本拼接到 system prompt
  const memoryInjectionText = context?.memoryInjectionText || ''
  const memorySection = memoryInjectionText
    ? `\n\n⚠️ 重要：以下是从记忆宫殿中提取的项目记忆与事实，请严格确保生成内容与这些记忆保持一致：\n${memoryInjectionText}`
    : ''

  // 写作知识库注入 — 从全局知识库中提取写作技巧参考
  const knowledgeInjectionText = context?.knowledgeInjectionText || ''
  const knowledgeSection = knowledgeInjectionText
    ? knowledgeInjectionText
    : ''

  const systemContent = baseNovelSystemPrompt() + styleGuardrails + memorySection + knowledgeSection + upstreamContext

  // Extract upstream results
  const worldResult = (context?.upstreamContext as any)?.['world-agent'] || (context?.upstreamContext as any)?.worldbuilding || null
  const charResult = (context?.upstreamContext as any)?.['character-agent'] || null
  const outlineResult = (context?.upstreamContext as any)?.['outline-agent'] || null

  // Task-specific prompt
  const taskPrompt = (() => {
    switch (agentId) {
      case 'market-agent':
        return buildMarketPrompt(project)
      case 'world-agent':
        return buildWorldPrompt(project, context?.task || '生成世界观设定')
      case 'character-agent':
        return buildCharacterPrompt(project, context?.task || '生成角色设定')
      case 'outline-agent':
        return buildOutlinePrompt(project, context?.outlineParams || context?.task || '生成大纲')
      case 'detail-outline-agent':
        return buildDetailOutlinePrompt(
          project,
          context?.chapterOutlines || [],
          context?.worldbuilding || null,
          context?.characters || [],
        )
      case 'continuity-agent':
        return buildContinuityCheckPrompt(
          project,
          context?.detailChapters || [],
          context?.worldbuilding || null,
          context?.characters || [],
        )
      case 'platform-fit-agent':
        return (context?.platformPrompt || context?.task || '')
      default:
        return buildChapterPrompt(project, context?.task || agentId)
    }
  })()

  const systemMsg: LLMMessage = { role: 'system', content: systemContent }
  const userMsg: LLMMessage = { role: 'user', content: taskPrompt }

  return [systemMsg, userMsg]
}

function parseAgentOutput(response: LLMResponse) {
  if (response.parsed && typeof response.parsed === 'object') return response.parsed
  const raw = typeof response.content === 'string' ? response.content : JSON.stringify(response.content || '')
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
  } catch {
    // keep raw text when the model did not return strict JSON
  }
  return raw
}

function toAgentStep(step: string, response: LLMResponse) {
  return {
    step,
    success: !response.error,
    outputSource: response.error ? 'error' : 'llm',
    output: parseAgentOutput(response),
    content: response.content,
    error: response.error || '',
    usage: response.usage,
  }
}

// ── Execute single agent ──

export async function executeNovelAgent(
  agentId: string,
  project: NovelProjectRecord,
  context: Record<string, any>,
  options: {
    modelId?: string
    activeWorkspace?: string
    temperature?: number
    maxTokens?: number
    streamTaskId?: string
    skipMemory?: boolean
  } = {},
): Promise<LLMResponse> {
  const { modelId, activeWorkspace, temperature = 0.7, maxTokens = 4000, skipMemory } = options

  // Build messages
  const messages = buildAgentMessages(agentId, project, context)
  const workspace = activeWorkspace || await loadActiveWorkspace()
  const preferredModelId = Number(modelId || 0) || undefined

  // Execute LLM
  const response = await executeWithRuntimeModel(
    workspace,
    {
      model: 'balanced',
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
      response_format: 'text',
    },
    preferredModelId,
  )

  // ── Memory Palace: store agent output ──
  if (!skipMemory) {
    await storeAgentOutputForProject(
      project.id,
      project.title,
      agentId,
      messages,
      response,
      context,
    )
  }

  return {
    ...response,
    output: parseAgentOutput(response),
  }
}

// ── Generate Novel Plan (Outline Generation) ──

export async function generateNovelPlan(
  project: NovelProjectRecord,
  params: {
    chapterCount?: number
    userOutline?: string
    modelId?: string
    activeWorkspace?: string
    skipMemory?: boolean
  } | string = {},
  activeWorkspaceArg?: string,
  modelIdArg?: string | number,
): Promise<any> {
  const normalizedParams = typeof params === 'object' && params !== null
    ? params
    : { userOutline: String(params || ''), activeWorkspace: activeWorkspaceArg, modelId: modelIdArg ? String(modelIdArg) : undefined }
  const { chapterCount, userOutline, modelId, activeWorkspace, skipMemory } = normalizedParams

  // Build outline parameters
  const outlineParams = normalizedParams as any

  // ── Memory Palace: recall existing memory ──
  let memoryInjectionText = ''
  if (!skipMemory) {
    try {
      const memResult = await buildMemoryInjectionForProject(project.id, project.title, {
        query: `${project.title} 大纲 ${project.genre || ''}`,
        categories: ['plot', 'worldbuilding'],
        topK: 5,
      })
      memoryInjectionText = memResult?.text || ''
    } catch (err) {
      console.warn('[memory-injection] Failed for generateNovelPlan:', String(err).slice(0, 200))
    }
  }

  // ── Knowledge Base: inject writing knowledge ──
  let knowledgeInjectionText = ''
  try {
    knowledgeInjectionText = await buildKnowledgeInjectionText(project, '大纲生成')
  } catch (err) {
    console.warn('[knowledge-injection] Failed for generateNovelPlan:', String(err).slice(0, 200))
  }

  // Execute outline agent
  const result = await executeNovelAgent(
    'outline-agent',
    project,
    {
      upstreamContext: {},
      memoryInjectionText,
      knowledgeInjectionText,
      outlineParams: {
        task: '生成故事大纲',
        chapterCount,
        userOutline,
        ...outlineParams,
      },
    },
    { modelId, activeWorkspace, skipMemory: false },
  )

  return result
}

// ── Execute Novel Agent Chain (Full Pipeline) ──

export async function executeNovelAgentChain(
  project: NovelProjectRecord,
  options: {
    modelId?: string
    activeWorkspace?: string
    skipMemory?: boolean
    continueFrom?: number
    existingChapters?: Array<any>
  } | string = {},
  activeWorkspaceArg?: string,
  modelIdArg?: string | number,
  _agentFilter?: string[],
  chainOptions?: {
    chapterCount?: number
    continueFrom?: number
    userOutline?: string
    existingChapters?: Array<any>
  },
): Promise<any> {
  const normalizedOptions = typeof options === 'object' && options !== null
    ? options
    : {
        activeWorkspace: activeWorkspaceArg,
        modelId: modelIdArg ? String(modelIdArg) : undefined,
        continueFrom: chainOptions?.continueFrom,
        existingChapters: chainOptions?.existingChapters,
      }
  const { modelId, activeWorkspace, skipMemory, continueFrom, existingChapters } = normalizedOptions

  // 1. Market Agent
  const marketResult = await executeNovelAgent(
    'market-agent',
    project,
    {},
    { modelId, activeWorkspace, skipMemory },
  )

  // 2. World Agent
  const worldResult = await executeNovelAgent(
    'world-agent',
    project,
    {
      upstreamContext: { 'market-agent': marketResult.content },
    },
    { modelId, activeWorkspace, skipMemory },
  )

  // 3. Character Agent
  const charResult = await executeNovelAgent(
    'character-agent',
    project,
    {
      upstreamContext: {
        'market-agent': marketResult.content,
        'world-agent': worldResult.content,
      },
    },
    { modelId, activeWorkspace, skipMemory },
  )

  // ── Memory Palace: recall for outline ──
  let memoryInjectionText = ''
  if (!skipMemory) {
    try {
      const memResult = await buildMemoryInjectionForProject(project.id, project.title, {
        query: `${project.title} 大纲 章节 ${project.genre || ''}`,
        categories: ['plot', 'worldbuilding', 'character'],
        topK: 5,
      })
      memoryInjectionText = memResult?.text || ''
    } catch (err) {
      console.warn('[memory-injection] Failed for executeNovelAgentChain:', String(err).slice(0, 200))
    }
  }

  // ── Knowledge Base: inject writing knowledge for outline ──
  let knowledgeInjectionText = ''
  try {
    knowledgeInjectionText = await buildKnowledgeInjectionText(project, '大纲生成')
  } catch (err) {
    console.warn('[knowledge-injection] Failed for executeNovelAgentChain:', String(err).slice(0, 200))
  }

  // 4. Outline Agent
  const outlineResult = await executeNovelAgent(
    'outline-agent',
    project,
    {
      upstreamContext: {
        'market-agent': marketResult.content,
        'world-agent': worldResult.content,
        'character-agent': charResult.content,
      },
      memoryInjectionText,  // 传给 buildAgentMessages 拼接到 prompt
      knowledgeInjectionText,
      outlineParams: {
        task: '生成故事大纲',
        continueFrom,
        existingChapters,
      },
    },
    { modelId, activeWorkspace, skipMemory: false },
  )

  // Parse outline result
  let outlineContent = null
  try {
    const raw = typeof outlineResult.content === 'string' ? outlineResult.content : JSON.stringify(outlineResult.content)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      outlineContent = JSON.parse(jsonMatch[0])
    }
  } catch { /* ignore */ }

  // 5. Detail Outline Agent
  const detailOutlineResult = await executeNovelAgent(
    'detail-outline-agent',
    project,
    {
      upstreamContext: {
        'world-agent': worldResult.content,
        'character-agent': charResult.content,
        'outline-agent': outlineResult.content,
      },
      worldbuilding: outlineContent?.worldbuilding || null,
      characters: outlineContent?.characters || [],
      chapterOutlines: outlineContent?.chapter_outlines || [],
      task: '扩写详细细纲',
    },
    { modelId, activeWorkspace, skipMemory },
  )

  let detailContent = null
  try {
    const raw = typeof detailOutlineResult.content === 'string' ? detailOutlineResult.content : JSON.stringify(detailOutlineResult.content)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      detailContent = JSON.parse(jsonMatch[0])
    }
  } catch { /* ignore */ }

  // 6. Continuity Check Agent
  const continuityResult = await executeNovelAgent(
    'continuity-agent',
    project,
    {
      upstreamContext: {
        'world-agent': worldResult.content,
        'character-agent': charResult.content,
        'outline-agent': outlineResult.content,
        'detail-outline-agent': detailOutlineResult.content,
      },
      worldbuilding: outlineContent?.worldbuilding || null,
      characters: outlineContent?.characters || [],
      detailChapters: detailContent?.detail_chapters || [],
      task: '连续性检查',
    },
    { modelId, activeWorkspace, skipMemory },
  )

  const results = [
    toAgentStep('market-agent', marketResult),
    toAgentStep('world-agent', worldResult),
    toAgentStep('character-agent', charResult),
    toAgentStep('outline-agent', outlineResult),
    toAgentStep('detail-outline-agent', detailOutlineResult),
    toAgentStep('continuity-check-agent', continuityResult),
  ]

  return {
    results,
    market: marketResult.content,
    world: worldResult.content,
    characters: charResult.content,
    outline: outlineResult.content,
    detail_outline: detailOutlineResult.content,
    continuity: continuityResult.content,
  }
}

// ── Generate Novel Chapter Prose ──

export async function generateNovelChapterProse(
  project: NovelProjectRecord,
  chapterDraft: Record<string, any>,
  context: {
    worldbuilding?: any;
    characters?: any;
    outline?: any;
    prevChapters?: Array<Record<string, any>>;
  },
  options: {
    modelId?: string
    activeWorkspace?: string
    skipMemory?: boolean
  } | string = {},
  modelIdArg?: string | number,
): Promise<LLMResponse> {
  const normalizedOptions = typeof options === 'object' && options !== null
    ? options
    : { activeWorkspace: options, modelId: modelIdArg ? String(modelIdArg) : undefined }
  const { modelId, activeWorkspace, skipMemory } = normalizedOptions

  // ── Memory Palace: recall chapter-specific memory ──
  let memoryInjection = ''
  if (!skipMemory) {
    try {
      const memResult = await buildMemoryInjectionForProject(project.id, project.title, {
        query: [
          project.title,
          project.genre || '',
          `第${chapterDraft.chapter_no}章`,
          chapterDraft.title || '',
          chapterDraft.chapter_summary || '',
          chapterDraft.goal || '',
          chapterDraft.conflict || '',
        ].filter(Boolean).join(' '),
        categories: ['plot', 'worldbuilding', 'character', 'foreshadowing', 'prose', 'general'],
        topK: 5,
        worldbuilding: context.worldbuilding,
        characters: Array.isArray(context.characters) ? context.characters : [],
        outline: context.outline,
        chapterTitle: chapterDraft.title,
        chapterSummary: chapterDraft.chapter_summary,
        prevChapters: context.prevChapters,
      })
      memoryInjection = memResult.text || ''
    } catch (err) {
      console.warn('[memory-injection] Failed for generateNovelChapterProse:', String(err).slice(0, 200))
    }
  }

  // ── Knowledge Base: inject writing knowledge for prose ──
  let knowledgeInjection = ''
  try {
    knowledgeInjection = await buildKnowledgeInjectionText(project, '正文创作')
  } catch (err) {
    console.warn('[knowledge-injection] Failed for generateNovelChapterProse:', String(err).slice(0, 200))
  }

  // Build prose prompt
  const prosePrompt = buildProsePrompt(project, chapterDraft, context)

  const upstreamContext = memoryInjection ? { memoryInjectionText: memoryInjection } : {}
  const knowledgeContext = knowledgeInjection ? { knowledgeInjectionText: knowledgeInjection } : {}

  // Execute prose agent
  const response = await executeNovelAgent(
    'prose-agent',
    project,
    {
      ...upstreamContext,
      ...knowledgeContext,
      upstreamContext: {
        worldbuilding: context.worldbuilding,
        characters: context.characters,
        outline: context.outline,
        prevChapters: context.prevChapters,
      },
      worldbuilding: context.worldbuilding,
      characters: context.characters,
      outline: context.outline,
      task: prosePrompt,
    },
    { modelId, activeWorkspace, skipMemory: false, maxTokens: 8000, temperature: 0.8 },
  )

  // ── Memory Palace: verify and store ──
  if (!skipMemory) {
    try {
      const proseContent = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
      await verifyAndStoreAgentOutputForProject(
        project.id,
        project.title,
        `prose-chapter-${chapterDraft.chapter_no}`,
        proseContent,
        'plot',
      )
    } catch (err) {
      console.warn('[memory-store] Failed to store prose output:', String(err).slice(0, 200))
    }
  }

  return response
}

// ── Init Memory Palace on module load ──

initMemoryPalace().catch(err => {
  console.warn('[memory-palace] Init failed:', String(err).slice(0, 200))
})
