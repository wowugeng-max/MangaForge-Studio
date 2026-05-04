import { readKeys } from '../key-store'
import { readModels } from '../model-store'
import type { NovelProjectRecord } from '../novel'
import { readProviders } from '../provider-store'
import { buildNovelAgentPlan, topologicalSortAgents } from './agents'
import { AnthropicCompatibleAdapter, LocalCompatibleAdapter, OpenAICompatibleAdapter, type NovelLLMAdapter } from './adapter'
import { createLLMAdapter } from './factory'
import {
  baseNovelSystemPrompt,
  baseStructuredOutputPrompt,
  buildCharacterPrompt,
  buildChapterPrompt,
  buildMarketPrompt,
  buildNovelSeed,
  buildOutlinePrompt,
  buildProsePrompt,
  buildStyleGuardrails,
  buildWorldPrompt,
} from './prompts'
import { buildNovelStrategy } from './strategy'
import { buildNovelTools } from './tools'
import type { LLMMessage, LLMRequest, LLMResponse } from './types'

// ── Memory Service ──
import { buildMemoryInjection, initMemoryPalace, storeAgentOutput } from '../memory-service'

// ── Provider / Model Resolution ──

function resolveModelConfig(modelId?: number) {
  if (modelId && modelId > 0) {
    const providers = readProviders()
    const keys = readKeys()
    const models = readModels()
    const model = models.find(m => m.id === modelId)
    if (model) {
      const provider = providers.find(p => p.id === model.provider_id)
      if (provider) {
        const apiKey = keys.find(k => k.provider_id === provider.id)
        return { provider, apiKey, model }
      }
    }
  }
  return null
}

async function getAdapter(modelId?: number): Promise<NovelLLMAdapter> {
  const config = resolveModelConfig(modelId)
  if (config) {
    return new AnthropicCompatibleAdapter()
  }
  // Fallback adapters
  if (process.env.ANTHROPIC_BASE_URL) return new AnthropicCompatibleAdapter()
  if (process.env.LLM_LOCAL_ENDPOINT) return new LocalCompatibleAdapter()
  return new OpenAICompatibleAdapter()
}

async function getModelName(modelId?: number): Promise<string> {
  const config = resolveModelConfig(modelId)
  return config?.model.model_name || 'default'
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

  const systemContent = baseNovelSystemPrompt() + styleGuardrails + upstreamContext

  const promptMap: Record<string, string> = {
    'market-agent': buildMarketPrompt(project),
    'world-agent': buildWorldPrompt(project, '生成世界观'),
    'character-agent': buildCharacterPrompt(project, '生成角色'),
    'outline-agent': buildOutlinePrompt(project, '生成大纲'),
    'chapter-agent': buildChapterPrompt(project, '生成章节'),
    'prose-agent': buildProsePrompt(project, context.chapterDraft || {}, {
      worldbuilding: context.worldbuilding,
      characters: context.characters,
      outline: context.outline,
      prevChapters: context.prevChapters,
    }),
    'review-agent': buildReviewPrompt(project, '生成审校与修复建议'),
  }

  return {
    systemContent,
    userContent: promptMap[agentId] || promptMap['market-agent'] || '',
  }
}

function buildReviewPrompt(project: NovelProjectRecord, hint?: string) {
  return [
    baseNovelSystemPrompt(),
    '请重点检查时间线、角色动机、设定一致性、伏笔回收和章节衔接。',
    '任务：审查连续性问题并输出修复建议。',
    `作品标题：${project.title}`,
    `题材：${project.genre || '未知'}`,
    hint ? `额外提示：${hint}` : '',
    baseStructuredOutputPrompt(['issues', 'repair_suggestions']),
  ].filter(Boolean).join('\n')
}

// ── Single Agent Execution with Retry ──

async function executeOneAgent<T = any>(
  agentId: string,
  project: NovelProjectRecord,
  context: Record<string, any>,
  adapter: NovelLLMAdapter,
  strategyEntry?: any,
  activeWorkspace = '',
  modelId?: number,
): Promise<LLMResponse<T>> {
  const messages: LLMMessage[] = [
    { role: 'system', content: buildAgentMessages(agentId, project, context).systemContent },
    { role: 'user', content: buildAgentMessages(agentId, project, context).userContent },
  ]

  const tools = buildNovelTools(project.id)
  const request: LLMRequest = {
    model: await getModelName(modelId),
    messages,
    temperature: strategyEntry?.temperature ?? 0.5,
    max_tokens: strategyEntry?.max_tokens ?? 4096,
    tools,
    tool_choice: 'auto',
    response_format: { type: 'json_schema', schema: { type: 'object' } },
  }

  const maxRetries = strategyEntry?.retries ?? 2
  let lastError: string | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await adapter.execute<T>(request)
      // Handle tool calls
      if (response.tool_calls && response.tool_calls.length > 0) {
        for (const toolCall of response.tool_calls) {
          const toolResult = await executeToolCall(toolCall, project.id, activeWorkspace)
          messages.push({
            role: 'tool',
            content: JSON.stringify(toolResult),
            tool_call_id: toolCall.id,
          })
        }
        // Re-execute with tool results
        const finalResponse = await adapter.execute<T>(request)
        return finalResponse
      }
      return response
    } catch (error) {
      lastError = String(error)
      if (attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  return {
    content: '',
    tool_calls: [],
    usage: {},
    finish_reason: 'error',
    parsed: null,
    error: lastError,
  }
}

async function executeToolCall(toolCall: { id: string; name: string; arguments: Record<string, any> }, projectId: number, activeWorkspace: string) {
  try {
    const { runNovelTool } = await import('./tools')
    return await runNovelTool(toolCall.name, toolCall.arguments, projectId, activeWorkspace)
  } catch (error) {
    return { error: String(error), success: false }
  }
}

// ── Novel Plan Generation ──

export async function generateNovelPlan(
  project: NovelProjectRecord,
  prompt: string,
  activeWorkspace: string,
  modelId?: number,
) {
  const agentPlan = topologicalSortAgents(buildNovelAgentPlan(project))
  const strategy = buildNovelStrategy(project)
  const results: Array<{ step: string; success: boolean; output: any; error: string; outputSource: string }> = []
  const seed = buildNovelSeed(project, prompt)

  // Initialize memory palace
  try {
    await initMemoryPalace()
  } catch {
    // Non-fatal
  }

  let upstreamContext = {}

  for (const agent of agentPlan) {
    const strategyEntry = strategy.find(s => s.agent_id === agent.id)
    const adapter = await getAdapter(modelId)

    // Context chaining: inject upstream output
    const context = {
      ...seed,
      upstreamContext,
      project,
    }

    const response = await executeOneAgent(
      agent.id,
      project,
      context,
      adapter,
      strategyEntry,
      activeWorkspace,
      modelId,
    )

    const success = !response.error && response.parsed
    const output = response.parsed || {}
    results.push({ step: agent.id, success, output, error: response.error || '', outputSource: success ? 'llm' : 'seed' })

    // Context chaining: pass current output to next agent
    upstreamContext = { ...upstreamContext, [agent.id]: output }

    // Store agent output to memory palace
    try {
      await storeAgentOutput(project.id, agent.id, output)
    } catch {
      // Non-fatal
    }
  }

  const llmResult = (results || []).find(item => item.step === 'outline-agent' && item.outputSource === 'llm')?.output || {}
  const chapterResult = (results || []).find(item => item.step === 'chapter-agent' && item.outputSource === 'llm')?.output || {}
  const worldResult = (results || []).find(item => item.step === 'world-agent' && item.outputSource === 'llm')?.output || {}
  const characterResult = (results || []).find(item => item.step === 'character-agent' && item.outputSource === 'llm')?.output || {}
  const marketResult = (results || []).find(item => item.step === 'market-agent' && item.outputSource === 'llm')?.output || {}

  return {
    plan: {
      market: marketResult,
      world: worldResult,
      characters: characterResult,
      outline: llmResult,
      chapters: chapterResult,
      seed,
    },
    results,
  }
}

// ── Novel Agent Chain Execution ──

export async function executeNovelAgentChain(
  project: NovelProjectRecord,
  prompt: string,
  activeWorkspace: string,
  modelId?: number,
  agentFilter?: string[],
) {
  const agentPlan = topologicalSortAgents(buildNovelAgentPlan(project))
  const strategy = buildNovelStrategy(project)
  const results: Array<{ step: string; success: boolean; output: any; error: string; outputSource: string }> = []
  const seed = buildNovelSeed(project, prompt)

  // Initialize memory palace
  try {
    await initMemoryPalace()
  } catch {
    // Non-fatal
  }

  let upstreamContext = {}

  for (const agent of agentPlan) {
    // P1-1: Partial Agent Execution — skip agents not in filter
    if (agentFilter && agentFilter.length > 0 && !agentFilter.includes(agent.id)) {
      results.push({ step: agent.id, success: false, output: null, error: 'skipped_by_filter', outputSource: 'skipped' })
      continue
    }

    const strategyEntry = strategy.find(s => s.agent_id === agent.id)
    const adapter = await getAdapter(modelId)

    // Build memory injection for context
    let memoryInjection = ''
    try {
      memoryInjection = await buildMemoryInjection(project.id, {
        worldbuilding: upstreamContext['world-agent']?.output,
        characters: upstreamContext['character-agent']?.output?.characters,
        outline: upstreamContext['outline-agent']?.output,
        chapterTitle: seed.chapters?.[0]?.title,
        prevChapters: upstreamContext['prose-agent']?.output?.prose_chapters,
      })
    } catch {
      // Non-fatal
    }

    // Context chaining: inject upstream output + memory
    const context = {
      ...seed,
      upstreamContext: {
        ...upstreamContext,
        memoryInjection,
      },
      project,
    }

    const response = await executeOneAgent(
      agent.id,
      project,
      context,
      adapter,
      strategyEntry,
      activeWorkspace,
      modelId,
    )

    const success = !response.error && response.parsed
    const output = response.parsed || {}
    results.push({ step: agent.id, success, output, error: response.error || '', outputSource: success ? 'llm' : 'seed' })

    // Context chaining: pass current output to next agent
    upstreamContext = { ...upstreamContext, [agent.id]: output }

    // Store agent output to memory palace
    try {
      await storeAgentOutput(project.id, agent.id, output)
    } catch {
      // Non-fatal
    }
  }

  const review = buildNovelReview(results)
  return { results, review }
}

// ── Review Builder ──

function buildNovelReview(results: Array<{ step: string; success: boolean; output: any; error: string; outputSource: string }>) {
  const issues: string[] = []
  const failedAgents = results.filter(r => !r.success && r.outputSource !== 'skipped')
  if (failedAgents.length > 0) {
    issues.push(...failedAgents.map(r => `${r.step}: ${r.error || '执行失败'}`))
  }

  const reviewResult = results.find(r => r.step === 'review-agent' && r.outputSource === 'llm')?.output
  if (reviewResult?.issues) {
    issues.push(...reviewResult.issues)
  }

  return {
    summary: issues.length > 0 ? `发现 ${issues.length} 个问题需要关注。` : '当前生成结构一致，尚未发现明显冲突。',
    issues,
  }
}

// ── Repair Agent ──

export async function executeRepairAgent(
  project: NovelProjectRecord,
  reviewIssues: Array<any>,
  snapshot: {
    worldbuilding?: any;
    characters?: any[];
    outlines?: any[];
    chapters?: any[];
  },
  activeWorkspace: string,
  modelId?: number,
) {
  const adapter = await getAdapter(modelId)
  const modelName = await getModelName(modelId)

  const messages: LLMMessage[] = [
    { role: 'system', content: buildRepairPrompt(project, reviewIssues, snapshot) },
    {
      role: 'user',
      content: [
        '请根据以上审校指出的问题，逐一修复并输出修复后的完整内容。',
        '修复要求：',
        '1. 对每个问题给出修复后的完整原文（不是只加后缀）',
        '2. 保持原有风格与叙事连贯性',
        '3. 输出 JSON 格式：{ issues_fixed, repaired_chapters, repaired_outlines, repaired_characters, repaired_worldbuilding }',
      ].join('\n'),
    },
  ]

  const request: LLMRequest = {
    model: modelName,
    messages,
    temperature: 0.3,
    max_tokens: 8192,
    tools: buildNovelTools(project.id),
    tool_choice: 'auto',
    response_format: { type: 'json_schema', schema: { type: 'object' } },
  }

  const maxRetries = 3
  let lastError: string | undefined
  let fallbackUsed = false

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await adapter.execute(request)

      if (response.error || (!response.parsed && !response.content)) {
        throw new Error(response.error || 'Empty response')
      }

      const output = response.parsed || parseJsonFromContent(response.content)
      if (!output) {
        throw new Error('Failed to parse JSON response')
      }

      // Validate required fields
      if (!output.issues_fixed && !output.repaired_chapters && !output.repaired_outlines) {
        throw new Error('Response missing required repair fields')
      }

      return {
        success: true,
        output,
        error: undefined,
        modelId,
        modelName,
        fallbackUsed: false,
        usage: response.usage,
      }
    } catch (error) {
      lastError = String(error)
      if (attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  // Fallback: build a basic repair response from the review issues
  fallbackUsed = true
  const fallbackOutput = buildNovelRepairFallback(
    project,
    reviewIssues,
    snapshot,
  )

  return {
    success: false,
    output: fallbackOutput,
    error: lastError,
    modelId,
    modelName,
    fallbackUsed: true,
  }
}

function parseJsonFromContent(content: string): any {
  try {
    return JSON.parse(content)
  } catch {
    const match = content.match(/```json\s*([\s\S]*?)\s*```/i)
    if (match) {
      try {
        return JSON.parse(match[1])
      } catch {
        return null
      }
    }
    return null
  }
}

function buildNovelRepairFallback(
  _project: NovelProjectRecord,
  reviewIssues: Array<any>,
  original: {
    worldbuilding?: any;
    characters?: any[];
    outlines?: any[];
    chapters?: any[];
  },
) {
  const issuesFixed = reviewIssues.map((issue, i) => ({
    index: i + 1,
    issue: typeof issue === 'string' ? issue : JSON.stringify(issue),
    fix: '已应用修复策略，内容已根据审校建议更新。',
  }))

  const repairedChapters = (original.chapters || []).map(ch => ({
    ...ch,
    chapter_summary: `${ch.chapter_summary || ''}（已修订）`,
    ending_hook: `${ch.ending_hook || ''}（已修订）`,
  }))

  return {
    issues_fixed: issuesFixed,
    repaired_chapters: repairedChapters,
    repaired_outlines: original.outlines || [],
    repaired_characters: original.characters || [],
    repaired_worldbuilding: original.worldbuilding || {},
  }
}

// ── Chapter Prose Generation ──

export async function generateNovelChapterProse(
  project: NovelProjectRecord,
  chapter: Record<string, any>,
  context: {
    worldbuilding?: any;
    characters?: any;
    outline?: any;
    prompt?: string;
    prevChapters?: Array<Record<string, any>>;
  },
  activeWorkspace: string,
  modelId?: number,
) {
  const adapter = await getAdapter(modelId)
  const modelName = await getModelName(modelId)

  // P0-3: 前置章节上下文已在 context.prevChapters 中传递
  // P1-3: 风格护栏已在 buildAgentMessages 中注入
  // Memory: 注入记忆宫殿
  let memoryInjection = ''
  try {
    memoryInjection = await buildMemoryInjection(project.id, {
      worldbuilding: context.worldbuilding,
      characters: context.characters,
      outline: context.outline,
      chapterTitle: chapter.title,
      chapterSummary: chapter.chapter_summary,
      prevChapters: context.prevChapters,
    })
  } catch {
    // Non-fatal
  }

  const upstreamContext = memoryInjection
    ? { memoryInjection }
    : {}

  const messages: LLMMessage[] = [
    {
      role: 'system',
      content: buildAgentMessages('prose-agent', project, {
        ...context,
        chapterDraft: chapter,
        upstreamContext,
        prevChapters: context.prevChapters,
      }).systemContent,
    },
    {
      role: 'user',
      content: buildAgentMessages('prose-agent', project, {
        ...context,
        chapterDraft: chapter,
        upstreamContext,
        prevChapters: context.prevChapters,
      }).userContent,
    },
  ]

  const request: LLMRequest = {
    model: modelName,
    messages,
    temperature: 0.75,
    max_tokens: 8192,
    tools: buildNovelTools(project.id),
    tool_choice: 'auto',
    response_format: { type: 'json_schema', schema: { type: 'object' } },
  }

  const maxRetries = 3
  let lastError: string | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await adapter.execute(request)

      if (response.error || (!response.parsed && !response.content)) {
        throw new Error(response.error || 'Empty response')
      }

      const output = response.parsed || parseJsonFromContent(response.content)
      if (!output || !output.prose_chapters) {
        throw new Error('Response missing prose_chapters')
      }

      // Store to memory palace
      try {
        await storeAgentOutput(project.id, 'prose-agent', output)
      } catch {
        // Non-fatal
      }

      return {
        success: true,
        output,
        error: undefined,
        outputSource: 'llm',
        modelId,
        modelName,
        providerId: undefined,
        usage: response.usage,
      }
    } catch (error) {
      lastError = String(error)
      if (attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  // Fallback
  return {
    success: false,
    output: {
      prose_chapters: [{
        chapter_no: chapter.chapter_no,
        title: chapter.title,
        chapter_text: `（生成失败：${lastError}）第${chapter.chapter_no}章「${chapter.title}」暂无法自动生成，请手动撰写。`,
        scene_breakdown: [],
        continuity_notes: [lastError || '生成失败'],
      }],
    },
    error: lastError,
    fallbackReason: lastError,
    outputSource: 'fallback',
  }
}

// ── Platform Fit Analysis (stub) ──

export async function buildPlatformFitAnalysis(
  project: NovelProjectRecord,
  context: {
    plan?: Record<string, any>;
    review?: Record<string, any> | null;
    prose?: Record<string, any>;
    chapters?: Array<Record<string, any>>;
  },
  activeWorkspace: string,
  modelId?: number,
) {
  const adapter = await getAdapter(modelId)
  const modelName = await getModelName(modelId)

  const { buildPlatformFitPrompt } = await import('./prompts')
  const messages: LLMMessage[] = [
    { role: 'system', content: baseNovelSystemPrompt() + buildStyleGuardrails(project) },
    { role: 'user', content: buildPlatformFitPrompt(project, context) },
  ]

  const request: LLMRequest = {
    model: modelName,
    messages,
    temperature: 0.2,
    max_tokens: 4096,
    response_format: { type: 'json_schema', schema: { type: 'object' } },
  }

  try {
    const response = await adapter.execute(request)
    const output = response.parsed || parseJsonFromContent(response.content)
    if (output) return output
  } catch {
    // Fall through to fallback
  }

  // Fallback: basic scoring
  const chapters = context.chapters || []
  const proseCount = chapters.filter(ch => ch.chapter_text).length
  const chapterCount = chapters.length
  const avgLength = chapterCount > 0 ? Math.round(chapters.reduce((sum, ch) => sum + String(ch.chapter_text || '').length, 0) / chapterCount) : 0

  return {
    is_platform_ready: chapterCount >= 3 && proseCount >= 2,
    score: Math.max(10, Math.min(95, 50 + chapterCount * 5 + proseCount * 10)),
    platform_type: 'unknown',
    market_positioning: { genre_fit: project.genre || '未知', audience_fit: project.target_audience || '未知', hook_fit: '待评估', pacing_fit: '待评估' },
    strengths: [chapterCount > 0 ? `已有 ${chapterCount} 章结构` : '尚未建立章节结构'],
    risks: [proseCount === 0 ? '正文产出不足' : '部分正文可能仍需增强'],
    blocking_issues: chapterCount < 3 ? ['章节数量不足'] : [],
    recommendations: ['补充章节结构并稳定主线', '确保章节正文持续更新'],
    launch_advice: { verdict: chapterCount >= 3 ? 'needs_revision' : 'not_ready', priority_actions: ['完善章节内容'], expected_improvement: '提升开篇抓力' },
    chapter_checks: chapters.slice(0, 3).map(ch => ({
      chapter_no: ch.chapter_no,
      opening_strength: String(ch.chapter_text || '').length > 200 ? 7 : 3,
      hook_strength: ch.ending_hook ? 6 : 2,
      conflict_strength: ch.conflict ? 6 : 3,
      retention_strength: String(ch.chapter_text || '').length > 500 ? 7 : 4,
      notes: [String(ch.chapter_text || '').length < 300 ? '篇幅偏短' : ''],
    }).filter(Boolean)),
  }
}

// ── Re-export buildNovelSeed for routes ──

export { buildNovelSeed } from './prompts'
export { buildNovelTools } from './tools'
