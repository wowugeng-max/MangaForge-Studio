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
export type ReferenceStrength = 'light' | 'balanced' | 'strong'

export const referenceStrengthLabels: Record<ReferenceStrength, string> = {
  light: '轻参考',
  balanced: '中参考',
  strong: '强参考',
}

export const referenceStrengthInstructions: Record<ReferenceStrength, string> = {
  light: '轻参考：只借鉴文风机制、章节节奏和局部表达组织，不迁移全书结构或核心设定公式。',
  balanced: '中参考：可借鉴结构、节奏、角色功能位、资源经济和文风机制，但必须替换世界观、职业身份、专名和桥段表达。',
  strong: '强参考：可参考全书公式、分卷推进、章节节拍、角色矩阵和资源经济模型，但仍必须彻底原创角色、设定名、事件顺序和正文表达。',
}

export const taskAliases: Record<string, string[]> = {
  大纲生成: ['全部', '全案', '规划', '大纲', '粗纲', '细纲', '章纲', '分卷', '剧情', '结构', '节奏', '资源经济'],
  全案规划: ['全部', '全案', '规划', '定位', '卖点', '套路', '大纲', '世界观', '角色', '文风'],
  世界观设定: ['全部', '世界观', '设定', '能力', '境界', '资源', '资源经济', '制度', '势力'],
  角色设定: ['全部', '角色', '人物', '人设', '关系', '群像', '情绪', '冲突'],
  正文创作: ['全部', '正文', '章节', '文风', '对白', '场景', '情绪', '节奏', '章末钩子'],
}

export const categoryByTask: Record<string, string[]> = {
  大纲生成: ['reference_profile', 'volume_architecture', 'story_design', 'story_pacing', 'genre_positioning', 'selling_point', 'reader_hook', 'conflict_design', 'resource_economy_model', 'resource_economy', 'character_function_matrix'],
  全案规划: ['reference_profile', 'volume_architecture', 'character_function_matrix', 'genre_positioning', 'selling_point', 'trope_design', 'worldbuilding', 'resource_economy_model', 'style_profile'],
  世界观设定: ['reference_profile', 'worldbuilding', 'ability_design', 'realm_design', 'resource_economy_model', 'resource_economy', 'conflict_design'],
  角色设定: ['character_function_matrix', 'character_design', 'emotion_design', 'conflict_design', 'reference_profile'],
  正文创作: ['style_profile', 'prose_syntax_profile', 'dialogue_mechanism', 'payoff_model', 'chapter_beat_template', 'writing_style', 'technique', 'scene_design', 'emotion_design', 'reader_hook', 'story_pacing'],
}

export const normalizeAlias = (value: string) => String(value || '').toLowerCase().replace(/\s+/g, '')

export function getReferenceStrength(project: NovelProjectRecord): ReferenceStrength {
  const raw = String((project.reference_config as any)?.strength || 'balanced')
  return raw === 'light' || raw === 'strong' ? raw : 'balanced'
}

export function matchesTask(taskType: string, useFor: string[]) {
  if (!useFor.length) return true
  const aliases = (taskAliases[taskType] || [taskType]).map(normalizeAlias)
  return useFor.map(normalizeAlias).some(item =>
    item === 'all' ||
    item === '全部' ||
    aliases.some(alias => item.includes(alias) || alias.includes(item)),
  )
}

export function getTaskCategories(taskType: string, strength: ReferenceStrength) {
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

export function normalizeReferenceRows(project: NovelProjectRecord) {
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

export async function buildKnowledgeInjectionContext(
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
export async function buildKnowledgeInjectionText(
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

export function compactProseText(value: any, limit = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

export function compactProsePreviousChapters(prevChapters: Array<Record<string, any>> = []) {
  return Array.isArray(prevChapters)
    ? prevChapters.slice(-3).map(chapter => {
        const chapterText = String(chapter?.chapter_text || chapter?.chapterText || '')
        const endingExcerpt = compactProseText(chapter?.ending_excerpt || chapter?.endingExcerpt || chapterText.slice(-800), 900)
        return {
          chapter_no: chapter?.chapter_no ?? chapter?.chapterNo,
          title: chapter?.title || '',
          chapter_summary: chapter?.chapter_summary || chapter?.summary || compactProseText(chapterText, 240),
          ending_hook: chapter?.ending_hook || chapter?.endingHook || '',
          ending_excerpt: endingExcerpt,
          chapter_text: endingExcerpt,
        }
      })
    : []
}

export function hasBoundedParagraphTask(context: Record<string, any>) {
  const task = context?.paragraphTask
  if (Array.isArray(task)) return task.some(item => String(item || '').trim())
  return Boolean(String(task || '').trim())
}

export function compactBoundedProseInjection(value: any, maxChars = 4000) {
  const text = String(value || '').trim()
  return text.length <= maxChars ? text : `${text.slice(0, maxChars)}\n…已按正文核心合同预算裁剪`
}

export function llmResponseContentText(response: any) {
  if (typeof response?.content === 'string') return response.content.trim()
  if (Array.isArray(response?.content)) {
    return response.content
      .map((item: any) => String(item?.text || item?.content || ''))
      .filter(Boolean)
      .join('\n')
      .trim()
  }
  return ''
}

export function streamTailUsageDetails(response: any) {
  const tail = Array.isArray(response?.raw?.stream_chunks_tail)
    ? response.raw.stream_chunks_tail
    : Array.isArray(response?.stream_chunks_tail)
      ? response.stream_chunks_tail
      : []
  const usage = [...tail].reverse().map((chunk: any) => chunk?.usage).find(Boolean) || {}
  return usage?.completion_tokens_details || usage?.completionTokensDetails || {}
}

export function shouldRetryReasoningOnlyEmptyProse(response: any) {
  if (llmResponseContentText(response)) return false
  const usage = response?.usage || {}
  const details = streamTailUsageDetails(response)
  const outputTokens = Number(
    usage.output_tokens
    ?? usage.completion_tokens
    ?? usage.completionTokens
    ?? 0,
  ) || 0
  const reasoningTokens = Number(
    details.reasoning_tokens
    ?? details.reasoningTokens
    ?? usage.reasoning_tokens
    ?? usage.reasoningTokens
    ?? 0,
  ) || 0
  const outputTextTokens = Number(
    details.output_text_tokens
    ?? details.outputTextTokens
    ?? usage.output_text_tokens
    ?? usage.outputTextTokens
    ?? 0,
  )
  return outputTokens >= 1000 && (reasoningTokens >= 1000 || outputTextTokens === 0)
}

export function directOutputRetryMaxTokens(maxTokens: number) {
  const base = Number(maxTokens || 0) || 8000
  return Math.min(64000, Math.max(base + 12000, Math.ceil(base * 1.8), 32000))
}

export function compactPreviousChapterUpstream(prevChapters: Array<Record<string, any>> = []) {
  return prevChapters.map(chapter => ({
    chapter_no: chapter.chapter_no,
    title: chapter.title,
    chapter_summary: chapter.chapter_summary,
    ending_hook: chapter.ending_hook,
    ending_excerpt: chapter.ending_excerpt,
  }))
}


export function buildAgentMessages(
  agentId: string,
  project: NovelProjectRecord,
  context: Record<string, any>,
) {
  const promptConfig = project.reference_config?.agent_prompt_config || {}
  const promptOverrides = promptConfig.project_overrides_enabled === false ? {} : (promptConfig.prompts || {})
  const systemOverride = String(promptOverrides?.[agentId]?.system || promptOverrides?.global?.system || '').trim()
  const userOverride = String(promptOverrides?.[agentId]?.user || promptOverrides?.[agentId]?.prompt || '').trim()
  // authoritativeTask：调用方已提供完整 user prompt，禁止再套一层 agent 模板（否则会挤掉章纲/分卷）
  const authoritativeTask = Boolean(context?.authoritativeTask)
    || (agentId === 'prose-agent' && context?.authoritativeProseTask === true)
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

  const systemContent = (authoritativeTask ? baseNovelSystemPrompt() : (systemOverride || baseNovelSystemPrompt()))
    + styleGuardrails + memorySection + knowledgeSection + upstreamContext

  // Extract upstream results
  const worldResult = (context?.upstreamContext as any)?.['world-agent'] || (context?.upstreamContext as any)?.worldbuilding || null
  const charResult = (context?.upstreamContext as any)?.['character-agent'] || null
  const outlineResult = (context?.upstreamContext as any)?.['outline-agent'] || null

  // Task-specific prompt
  const taskPrompt = authoritativeTask ? context.task : userOverride || (() => {
    switch (agentId) {
      case 'market-agent':
        return buildMarketPrompt(project)
      case 'world-agent':
        return buildWorldPrompt(project, context?.task || '生成世界观设定')
      case 'character-agent':
        return buildCharacterPrompt(project, context?.task || '生成角色设定')
      case 'setting-agent':
        return context?.task || '请生成可入库的设定工坊资产，输出 settings 数组和能力、境界、物品、势力、Boss、规则、地点、伏笔、时间线体系。'
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


export function parseAgentOutput(response: LLMResponse) {
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


export function toAgentStep(step: string, response: LLMResponse) {
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

export const agentStageById: Record<string, string> = {
  'market-agent': 'incubation',
  'world-agent': 'incubation',
  'character-agent': 'incubation',
  'setting-agent': 'incubation',
  'outline-agent': 'outline',
  'detail-outline-agent': 'outline',
  'continuity-check-agent': 'outline',
  'continuity-agent': 'outline',
  'prose-agent': 'draft',
  'review-agent': 'review',
}

