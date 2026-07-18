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
import {
  referenceStrengthLabels,
  buildKnowledgeInjectionContext,
  buildKnowledgeInjectionText,
  compactProsePreviousChapters,
  hasBoundedParagraphTask,
  compactBoundedProseInjection,
  llmResponseContentText,
  shouldRetryReasoningOnlyEmptyProse,
  directOutputRetryMaxTokens,
  compactPreviousChapterUpstream,
  buildAgentMessages,
  parseAgentOutput,
  toAgentStep,
  agentStageById,
} from './executor-helpers'

export async function previewNovelKnowledgeInjection(project: NovelProjectRecord, taskType: string) {
  const context = await buildKnowledgeInjectionContext(project, taskType || '大纲生成')
  return {
    task_type: taskType || '大纲生成',
    strength: context.strength,
    strength_label: referenceStrengthLabels[context.strength],
    task_categories: context.task_categories,
    active_references: context.active_references,
    warnings: context.warnings,
    text: context.text,
    entries: context.entries.map(entry => ({
      id: entry.id,
      category: entry.category,
      title: entry.title,
      content: entry.content,
      weight: entry.weight,
      similarity: entry.similarity,
      rank_score: entry.rank_score,
      source_project: entry.source_project || entry.project_title,
      reference_weight: entry.reference_weight,
      use_case: entry.use_case,
      chapter_range: entry.chapter_range,
      evidence: entry.evidence,
      entities: entry.entities,
      match_reason: [
        entry.source_project || entry.project_title ? `参考项目：${entry.source_project || entry.project_title}` : '',
        entry.category ? `匹配分类：${entry.category}` : '',
        entry.reference_weight ? `参考权重：${Math.round(Number(entry.reference_weight) * 100)}%` : '',
        entry.rank_score ? `排序分：${Number(entry.rank_score).toFixed(2)}` : '',
      ].filter(Boolean).join('；'),
    })),
  }
}

// ── Agent Message Builder ──

export function resolveAgentPreferredModelId(agentId: string, project: NovelProjectRecord, explicitModelId?: string | number) {
  const explicit = Number(explicitModelId || 0) || undefined
  if (explicit) return explicit
  const strategy = (project.reference_config as any)?.model_strategy || {}
  const stage = agentStageById[agentId] || ''
  return Number(strategy?.stages?.[stage]?.model_id || strategy?.preferred_model_id || 0) || undefined
}

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
    responseMode?: 'auto' | 'stream' | 'non_stream'
    skipMemory?: boolean
    signal?: AbortSignal
    timeoutMs?: number
  } = {},
): Promise<LLMResponse> {
  const { modelId, activeWorkspace, temperature = 0.7, maxTokens = 4000, responseMode, skipMemory } = options

  // Build messages
  const messages = buildAgentMessages(agentId, project, context)
  const workspace = activeWorkspace || await loadActiveWorkspace()
  const preferredModelId = resolveAgentPreferredModelId(agentId, project, modelId)

  // Execute LLM
  const response = await executeWithRuntimeModel(
    workspace,
    {
      model: 'balanced',
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: responseMode === 'non_stream' ? false : true,
      response_mode: responseMode,
      response_format: 'text',
    },
    preferredModelId,
    {
      signal: options.signal,
      timeoutMs: options.timeoutMs,
    },
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
    chapterCount?: number
    userOutline?: string
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
        chapterCount: chainOptions?.chapterCount,
        userOutline: chainOptions?.userOutline,
        continueFrom: chainOptions?.continueFrom,
        existingChapters: chainOptions?.existingChapters,
      }
  const { modelId, activeWorkspace, skipMemory, chapterCount, userOutline, continueFrom, existingChapters } = normalizedOptions

  const knowledgeForTask = async (taskType: string) => {
    try {
      return await buildKnowledgeInjectionText(project, taskType)
    } catch (err) {
      console.warn(`[knowledge-injection] Failed for ${taskType}:`, String(err).slice(0, 200))
      return ''
    }
  }

  // 1. Market Agent
  const marketKnowledgeInjectionText = await knowledgeForTask('全案规划')
  const marketResult = await executeNovelAgent(
    'market-agent',
    project,
    { knowledgeInjectionText: marketKnowledgeInjectionText },
    { modelId, activeWorkspace, skipMemory },
  )

  // 2. World Agent
  const worldKnowledgeInjectionText = await knowledgeForTask('世界观设定')
  const worldResult = await executeNovelAgent(
    'world-agent',
    project,
    {
      upstreamContext: { 'market-agent': marketResult.content },
      knowledgeInjectionText: worldKnowledgeInjectionText,
    },
    { modelId, activeWorkspace, skipMemory },
  )

  // 3. Character Agent
  const characterKnowledgeInjectionText = await knowledgeForTask('角色设定')
  const charResult = await executeNovelAgent(
    'character-agent',
    project,
    {
      upstreamContext: {
        'market-agent': marketResult.content,
        'world-agent': worldResult.content,
      },
      knowledgeInjectionText: characterKnowledgeInjectionText,
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
        chapterCount,
        userOutline,
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
    abortSignal?: AbortSignal;
    llmTimeoutMs?: number;
  },
  options: {
    modelId?: string
    activeWorkspace?: string
    skipMemory?: boolean
    skipMemoryStore?: boolean
  } | string = {},
  modelIdArg?: string | number,
): Promise<LLMResponse> {
  const normalizedOptions = typeof options === 'object' && options !== null
    ? options
    : { activeWorkspace: options, modelId: modelIdArg ? String(modelIdArg) : undefined }
  const { modelId, activeWorkspace, skipMemory, skipMemoryStore } = normalizedOptions
  const skipAgentMemoryStore = Boolean(skipMemory || skipMemoryStore)
  const boundedProseContract = (context as any).boundedProseContract === true
  const boundedParagraphTask = boundedProseContract || hasBoundedParagraphTask(context as any)
  const compactPrevChapters = compactProsePreviousChapters(context.prevChapters)
  const compactPromptContext = {
    ...(context as any),
    prevChapters: compactPrevChapters,
  }

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
        categories: ['worldbuilding', 'character', 'foreshadowing', 'general'],
        topK: 5,
        worldbuilding: context.worldbuilding,
        characters: Array.isArray(context.characters) ? context.characters : [],
        outline: context.outline,
        chapterTitle: chapterDraft.title,
        chapterSummary: chapterDraft.chapter_summary,
        prevChapters: compactPrevChapters,
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
  if (boundedProseContract) {
    memoryInjection = compactBoundedProseInjection(memoryInjection)
    knowledgeInjection = compactBoundedProseInjection(knowledgeInjection)
  }

  // Build prose prompt
  const strictTargetPrompt = [
    `任务：只生成第 ${chapterDraft.chapter_no} 章《${chapterDraft.title || '无标题'}》的正文。`,
    `禁止输出其他章节、续章、目录、分卷总结或额外解释。`,
    `若输出 prose_chapters 数组，数组只能包含这一章，且 chapter_no 必须严格等于 ${chapterDraft.chapter_no}。`,
  ].join('\n')
  const prosePrompt = `${strictTargetPrompt}\n\n${(context as any).paragraphTask || buildProsePrompt(project, chapterDraft, compactPromptContext)}`

  const memoryContext = memoryInjection ? { memoryInjectionText: memoryInjection } : {}
  const knowledgeContext = knowledgeInjection ? { knowledgeInjectionText: knowledgeInjection } : {}
  const proseUpstreamContext = boundedParagraphTask
    ? {
        prose_context_mode: 'bounded_paragraph_task',
        previous_chapters: compactPreviousChapterUpstream(compactPrevChapters),
      }
    : {
        worldbuilding: context.worldbuilding,
        characters: context.characters,
        outline: context.outline,
        prevChapters: compactPrevChapters,
      }
  const agentContext = boundedParagraphTask
    ? {
        ...memoryContext,
        ...knowledgeContext,
        upstreamContext: proseUpstreamContext,
        task: prosePrompt,
        authoritativeProseTask: true,
      }
    : {
        ...memoryContext,
        ...knowledgeContext,
        upstreamContext: proseUpstreamContext,
        worldbuilding: context.worldbuilding,
        characters: context.characters,
        outline: context.outline,
        task: prosePrompt,
      }

  // Execute prose agent
  const maxTokens = Number((context as any).maxTokens || 8000)
  const response = await executeNovelAgent(
    'prose-agent',
    project,
    agentContext,
    { modelId, activeWorkspace, skipMemory: skipAgentMemoryStore, maxTokens, temperature: 0.8, signal: (context as any).abortSignal, timeoutMs: (context as any).llmTimeoutMs },
  )
  let finalResponse = response
  if (shouldRetryReasoningOnlyEmptyProse(response)) {
    const retryPrompt = [
      prosePrompt,
      '',
      '【空输出重试约束】',
      '上一轮模型消耗了输出额度但没有返回正文。不要输出思考过程、分析、解释、提纲或计划。',
      `直接输出第 ${chapterDraft.chapter_no} 章《${chapterDraft.title || '无标题'}》的完整正文 JSON；如果使用 prose_chapters，只允许包含本章。`,
      'chapter_text 必须是可入库的简体中文正文。',
    ].join('\n')
    const retryResponse = await executeNovelAgent(
      'prose-agent',
      project,
      {
        ...agentContext,
        task: retryPrompt,
      },
      {
        modelId,
        activeWorkspace,
        skipMemory: skipAgentMemoryStore,
        maxTokens: directOutputRetryMaxTokens(maxTokens),
        temperature: 0.65,
        responseMode: 'non_stream',
        signal: (context as any).abortSignal,
        timeoutMs: (context as any).llmTimeoutMs,
      },
    )
    if (llmResponseContentText(retryResponse)) {
      finalResponse = {
        ...retryResponse,
        empty_reasoning_retry: {
          triggered: true,
          previous_usage: response.usage,
          previous_finish_reason: response.finish_reason,
        },
      }
    }
  }

  // ── Memory Palace: verify and store ──
  if (!skipMemory && !skipMemoryStore) {
    try {
      const proseContent = typeof finalResponse.content === 'string' ? finalResponse.content : JSON.stringify(finalResponse.content)
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

  return {
    ...finalResponse,
    prose_prompt_diagnostics: {
      ...((context as any).promptDiagnostics || {}),
      model_usage: finalResponse?.usage || finalResponse?.raw?.usage || null,
    },
  }
}

export async function storeNovelChapterProseMemory(
  project: NovelProjectRecord,
  chapterNo: number,
  finalText: string,
) {
  if (!String(finalText || '').trim()) return
  await verifyAndStoreAgentOutputForProject(
    project.id,
    project.title,
    `prose-chapter-${chapterNo}`,
    finalText,
    'plot',
  )
}

// ── Init Memory Palace on module load ──

initMemoryPalace().catch(err => {
  console.warn('[memory-palace] Init failed:', String(err).slice(0, 200))
})
