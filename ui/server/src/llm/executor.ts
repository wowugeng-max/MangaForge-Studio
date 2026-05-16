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
type ReferenceStrength = 'light' | 'balanced' | 'strong'

const referenceStrengthLabels: Record<ReferenceStrength, string> = {
  light: '轻参考',
  balanced: '中参考',
  strong: '强参考',
}

const referenceStrengthInstructions: Record<ReferenceStrength, string> = {
  light: '轻参考：只借鉴文风机制、章节节奏和局部表达组织，不迁移全书结构或核心设定公式。',
  balanced: '中参考：可借鉴结构、节奏、角色功能位、资源经济和文风机制，但必须替换世界观、职业身份、专名和桥段表达。',
  strong: '强参考：可参考全书公式、分卷推进、章节节拍、角色矩阵和资源经济模型，但仍必须彻底原创角色、设定名、事件顺序和正文表达。',
}

const taskAliases: Record<string, string[]> = {
  大纲生成: ['全部', '全案', '规划', '大纲', '粗纲', '细纲', '章纲', '分卷', '剧情', '结构', '节奏', '资源经济'],
  全案规划: ['全部', '全案', '规划', '定位', '卖点', '套路', '大纲', '世界观', '角色', '文风'],
  世界观设定: ['全部', '世界观', '设定', '能力', '境界', '资源', '资源经济', '制度', '势力'],
  角色设定: ['全部', '角色', '人物', '人设', '关系', '群像', '情绪', '冲突'],
  正文创作: ['全部', '正文', '章节', '文风', '对白', '场景', '情绪', '节奏', '章末钩子'],
}

const categoryByTask: Record<string, string[]> = {
  大纲生成: ['reference_profile', 'volume_architecture', 'story_design', 'story_pacing', 'genre_positioning', 'selling_point', 'reader_hook', 'conflict_design', 'resource_economy_model', 'resource_economy', 'character_function_matrix'],
  全案规划: ['reference_profile', 'volume_architecture', 'character_function_matrix', 'genre_positioning', 'selling_point', 'trope_design', 'worldbuilding', 'resource_economy_model', 'style_profile'],
  世界观设定: ['reference_profile', 'worldbuilding', 'ability_design', 'realm_design', 'resource_economy_model', 'resource_economy', 'conflict_design'],
  角色设定: ['character_function_matrix', 'character_design', 'emotion_design', 'conflict_design', 'reference_profile'],
  正文创作: ['style_profile', 'prose_syntax_profile', 'dialogue_mechanism', 'payoff_model', 'chapter_beat_template', 'writing_style', 'technique', 'scene_design', 'emotion_design', 'reader_hook', 'story_pacing'],
}

const normalizeAlias = (value: string) => String(value || '').toLowerCase().replace(/\s+/g, '')

function getReferenceStrength(project: NovelProjectRecord): ReferenceStrength {
  const raw = String((project.reference_config as any)?.strength || 'balanced')
  return raw === 'light' || raw === 'strong' ? raw : 'balanced'
}

function matchesTask(taskType: string, useFor: string[]) {
  if (!useFor.length) return true
  const aliases = (taskAliases[taskType] || [taskType]).map(normalizeAlias)
  return useFor.map(normalizeAlias).some(item =>
    item === 'all' ||
    item === '全部' ||
    aliases.some(alias => item.includes(alias) || alias.includes(item)),
  )
}

function getTaskCategories(taskType: string, strength: ReferenceStrength) {
  const base = categoryByTask[taskType] || categoryByTask.全案规划
  if (strength === 'balanced') return base

  if (strength === 'light') {
    const lightCats = new Set(['style_profile', 'prose_syntax_profile', 'dialogue_mechanism', 'payoff_model', 'chapter_beat_template', 'writing_style', 'technique', 'story_pacing', 'scene_design', 'emotion_design', 'reader_hook'])
    const filtered = base.filter(cat => lightCats.has(cat))
    return filtered.length ? filtered : ['style_profile', 'prose_syntax_profile', 'dialogue_mechanism', 'payoff_model', 'chapter_beat_template', 'writing_style', 'technique', 'story_pacing']
  }

  return Array.from(new Set([
    ...base,
    'reference_profile',
    'volume_architecture',
    'chapter_beat_template',
    'character_function_matrix',
    'resource_economy_model',
    'style_profile',
    'prose_syntax_profile',
    'dialogue_mechanism',
    'payoff_model',
    'story_design',
    'story_pacing',
    'conflict_design',
  ]))
}

function normalizeReferenceRows(project: NovelProjectRecord) {
  return Array.isArray(project.reference_config?.references)
    ? project.reference_config.references
        .map((item: any) => ({
          project_title: String(item?.project_title || '').trim(),
          weight: Math.max(0.1, Math.min(1, Number(item?.weight || 0.7) || 0.7)),
          use_for: Array.isArray(item?.use_for) ? item.use_for.map((v: any) => String(v).trim()).filter(Boolean) : [],
          dimensions: Array.isArray(item?.dimensions) ? item.dimensions.map((v: any) => String(v).trim()).filter(Boolean) : [],
          avoid: Array.isArray(item?.avoid) ? item.avoid.map((v: any) => String(v).trim()).filter(Boolean) : [],
        }))
        .filter((item: any) => item.project_title)
    : []
}

async function buildKnowledgeInjectionContext(
  project: NovelProjectRecord,
  taskType: string,
): Promise<{
  text: string
  entries: any[]
  active_references: any[]
  warnings: string[]
  strength: ReferenceStrength
  task_categories: string[]
}> {
  const warnings: string[] = []
  const strength = getReferenceStrength(project)
  const references = normalizeReferenceRows(project)
  const activeReferences = references.filter((ref: any) => matchesTask(taskType, ref.use_for))
  const taskCategories = getTaskCategories(taskType, strength)
  const referenceNotes = String(project.reference_config?.notes || '').trim()
  const referenceGuideText = activeReferences.length > 0
    ? [
        '【参考作品配置】',
        `仿写强度：${referenceStrengthLabels[strength]}。${referenceStrengthInstructions[strength]}`,
        ...activeReferences.map((ref: any) => {
          const parts = [
            `- ${ref.project_title}`,
            `权重 ${Math.round(ref.weight * 100)}%`,
            ref.use_for.length ? `用途：${ref.use_for.join('、')}` : '',
            ref.dimensions.length ? `参考维度：${ref.dimensions.join('、')}` : '',
            ref.avoid.length ? `避免照搬：${ref.avoid.join('、')}` : '',
          ].filter(Boolean)
          return parts.join('；')
        }),
        referenceNotes ? `补充策略：${referenceNotes}` : '',
        '执行要求：只迁移结构、节奏、角色功能位、资源经济与文风机制，不复制原作品角色名、专有名词、具体桥段顺序和原文表达。',
      ].filter(Boolean).join('\n')
    : ''

  const queryParts: string[] = []
  if (project.genre) queryParts.push(project.genre)
  if (project.style_tags?.length) queryParts.push(...project.style_tags)
  if (project.synopsis) queryParts.push(project.synopsis.slice(0, 200))
  queryParts.push(taskType)

  const query = queryParts.join(' ')
  if (!query) return { text: '', entries: [], active_references: activeReferences, warnings, strength, task_categories: taskCategories }

  const collected: Array<any> = []
  const seen = new Set<string>()
  const addEntries = (entries: any[], sourceProject = '', referenceWeight?: number) => {
    for (const entry of entries) {
      const key = `${entry.id || ''}:${entry.category}:${entry.title || entry.content?.slice(0, 40)}`
      if (seen.has(key)) continue
      seen.add(key)
      collected.push({ ...entry, source_project: sourceProject || entry.project_title || '', reference_weight: referenceWeight })
    }
  }

  if (activeReferences.length > 0) {
    for (const ref of activeReferences) {
      const useFor = ref.use_for.length ? ref.use_for.join(' ') : taskType
      const dimensions = ref.dimensions.length ? ref.dimensions.join(' ') : ''
      const refQuery = [query, useFor, dimensions, `参考作品 ${ref.project_title}`, referenceStrengthLabels[strength]].filter(Boolean).join(' ')
      const profileEntries = await queryKnowledge(refQuery, { top_k: strength === 'strong' ? 8 : 6, project_title: ref.project_title })
      addEntries(profileEntries.filter(entry => taskCategories.includes(entry.category) || !entry.category), ref.project_title, ref.weight)

      for (const category of taskCategories.slice(0, strength === 'strong' ? 8 : 6)) {
        const categoryEntries = await queryKnowledge(refQuery, { top_k: strength === 'light' ? 1 : 2, project_title: ref.project_title, category })
        addEntries(categoryEntries, ref.project_title, ref.weight)
      }
    }
  }

  const entries = collected.length > 0
    ? collected
    : (activeReferences.length > 0 ? [] : await queryKnowledge(query, { top_k: 8 }))
  if (!entries.length) {
    if (referenceGuideText) warnings.push('当前参考作品未命中可注入知识条目，请补齐参考作品画像、章节节拍模板、角色功能矩阵和文风画像。')
    return {
      text: referenceGuideText ? `${referenceGuideText}\n提示：${warnings[0]}` : '',
      entries: [],
      active_references: activeReferences,
      warnings,
      strength,
      task_categories: taskCategories,
    }
  }

  const limitByStrength: Record<ReferenceStrength, number> = { light: 10, balanced: 18, strong: 24 }
  const ranked = entries
    .map(entry => ({ ...entry, rank_score: Number(entry.reference_weight || 0.5) * 10 + Number(entry.weight || 3) + Number(entry.similarity || 0) }))
    .sort((a, b) => b.rank_score - a.rank_score)
    .slice(0, activeReferences.length > 0 ? limitByStrength[strength] : 8)

  const knowledgeText = buildKnowledgeInjectionPrompt(
    project.genre || '',
    taskType,
    ranked.map(e => ({
      category: e.category,
      title: e.title,
      content: e.content,
      weight: e.weight,
      genre_tags: e.genre_tags,
      trope_tags: e.trope_tags,
      use_case: e.use_case,
      evidence: e.evidence,
      chapter_range: e.chapter_range,
      source_project: e.source_project || e.project_title,
      reference_weight: e.reference_weight,
    })),
  )

  return {
    text: referenceGuideText ? `${referenceGuideText}\n\n${knowledgeText}` : knowledgeText,
    entries: ranked,
    active_references: activeReferences,
    warnings,
    strength,
    task_categories: taskCategories,
  }
}

/**
 * Query the knowledge base based on project genre + task type,
 * then build a knowledge injection text to append to the prompt.
 */
async function buildKnowledgeInjectionText(
  project: NovelProjectRecord,
  taskType: string,
): Promise<string> {
  try {
    return (await buildKnowledgeInjectionContext(project, taskType)).text
  } catch (err) {
    console.warn('[knowledge-injection] Failed to build injection:', String(err).slice(0, 200))
    return ''
  }
}

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

function buildAgentMessages(
  agentId: string,
  project: NovelProjectRecord,
  context: Record<string, any>,
) {
  const promptConfig = project.reference_config?.agent_prompt_config || {}
  const promptOverrides = promptConfig.project_overrides_enabled === false ? {} : (promptConfig.prompts || {})
  const systemOverride = String(promptOverrides?.[agentId]?.system || promptOverrides?.global?.system || '').trim()
  const userOverride = String(promptOverrides?.[agentId]?.user || promptOverrides?.[agentId]?.prompt || '').trim()
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

  const systemContent = (systemOverride || baseNovelSystemPrompt()) + styleGuardrails + memorySection + knowledgeSection + upstreamContext

  // Extract upstream results
  const worldResult = (context?.upstreamContext as any)?.['world-agent'] || (context?.upstreamContext as any)?.worldbuilding || null
  const charResult = (context?.upstreamContext as any)?.['character-agent'] || null
  const outlineResult = (context?.upstreamContext as any)?.['outline-agent'] || null

  // Task-specific prompt
  const taskPrompt = userOverride || (() => {
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
      case 'prose-agent':
        return context?.task || buildProsePrompt(project, context?.chapterDraft || {}, context || {})
      case 'review-agent':
        return context?.task || '请审校当前正文并输出 JSON。'
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
    responseMode?: 'auto' | 'stream' | 'non_stream'
    skipMemory?: boolean
  } = {},
): Promise<LLMResponse> {
  const { modelId, activeWorkspace, temperature = 0.7, maxTokens = 4000, responseMode, skipMemory } = options

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
      stream: responseMode === 'non_stream' ? false : true,
      response_mode: responseMode,
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
        categories: ['worldbuilding', 'character', 'foreshadowing', 'general'],
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
  const strictTargetPrompt = [
    `任务：只生成第 ${chapterDraft.chapter_no} 章《${chapterDraft.title || '无标题'}》的正文。`,
    `禁止输出其他章节、续章、目录、分卷总结或额外解释。`,
    `若输出 prose_chapters 数组，数组只能包含这一章，且 chapter_no 必须严格等于 ${chapterDraft.chapter_no}。`,
  ].join('\n')
  const prosePrompt = `${strictTargetPrompt}\n\n${(context as any).paragraphTask || buildProsePrompt(project, chapterDraft, context)}`

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
