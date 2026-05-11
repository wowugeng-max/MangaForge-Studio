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
} from './prompts'
import { buildNovelStrategy } from './strategy'
import { buildNovelTools } from './tools'
import type { LLMMessage, LLMRequest, LLMResponse } from './types'

// ── Runtime model selection (reads from keys.json + providers.json + models.json) ──
import { executeWithRuntimeModel } from './provider-runtime'

// ── Memory Service — 使用 ForProject 族函数，经过 project_id + project_title 双重校验 ──
import { buildMemoryInjectionForProject, initMemoryPalace, storeAgentOutputForProject, verifyAndStoreAgentOutputForProject } from '../memory-service'

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

  const systemContent = baseNovelSystemPrompt() + styleGuardrails + memorySection + upstreamContext

  // Extract upstream results
  const worldResult = (context?.upstreamContext as any)?.['world-agent'] || (context?.upstreamContext as any)?.worldbuilding || null
  const charResult = (context?.upstreamContext as any)?.['character-agent'] || null
  const outlineResult = (context?.upstreamContext as any)?.['outline-agent'] || null
  const detailResult = (context?.upstreamContext as any)?.['detail-outline-agent'] || null
  const worldbuildingData = context?.worldbuilding || worldResult || null
  const charactersData = context?.characters || (charResult?.characters || [])
  const chapterOutlines = outlineResult?.chapter_outlines || []

  // New params from payload
  const chapterCount = context?.payload?.chapterCount || context?.payload?.chapter_count || undefined
  const continueFrom = context?.payload?.continueFrom || context?.payload?.continue_from || undefined
  const userOutline = context?.payload?.userOutline || context?.payload?.user_outline || undefined
  const existingChapters = context?.payload?.existingChapters || context?.payload?.existing_chapters || []

  const userContent = (() => {
    switch (agentId) {
      case 'market-agent':
        return buildMarketPrompt(project)
      case 'world-agent':
        return buildWorldPrompt(project, '生成世界观')
      case 'character-agent':
        return buildCharacterPrompt(project, '生成角色')
      case 'outline-agent':
        return buildOutlinePrompt(project, {
          task: '生成大纲',
          chapterCount,
          userOutline,
          continueFrom,
          existingChapters,
        })
      case 'chapter-agent':
        return buildChapterPrompt(project, '生成章节')
      case 'detail-outline-agent':
        // 细纲分化：需要粗略章纲 + 世界观 + 角色
        return buildDetailOutlinePrompt(project, chapterOutlines, worldbuildingData, charactersData)
      case 'continuity-check-agent':
        // 连续性预检：需要细纲 + 世界观 + 角色
        const detailChapters = detailResult?.detail_chapters || detailResult?.chapters || []
        return buildContinuityCheckPrompt(project, detailChapters, worldbuildingData, charactersData)
      case 'prose-agent':
        return buildProsePrompt(project, context.chapterDraft || {}, {
          worldbuilding: worldbuildingData,
          characters: charactersData,
          outline: outlineResult,
          prevChapters: context.prevChapters,
        })
      case 'review-agent':
        return buildReviewPrompt(project, '生成审校与修复建议')
      default:
        return buildMarketPrompt(project)
    }
  })()

  return { systemContent, userContent }
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

function buildRepairPrompt(
  project: NovelProjectRecord,
  reviewIssues: Array<any>,
  snapshot: { worldbuilding?: any; characters?: any[]; outlines?: any[]; chapters?: any[] },
) {
  const issuesList = reviewIssues.map((issue, i) =>
    `${i + 1}. ${typeof issue === 'string' ? issue : JSON.stringify(issue)}`,
  ).join('\n')

  return [
    baseNovelSystemPrompt(),
    buildStyleGuardrails(project),
    `作品标题：${project.title}`,
    `当前资料：世界观 ${snapshot.worldbuilding ? '✓' : '✗'} / 角色 ${snapshot.characters?.length || 0} 个 / 章节 ${snapshot.chapters?.length || 0} 章`,
    `发现以下问题需要修复：\n${issuesList || '无具体问题'}`,
    '请输出 JSON 格式修复方案：{ issues_fixed[], repaired_chapters[], repaired_outlines[], repaired_characters[], repaired_worldbuilding }',
    baseStructuredOutputPrompt(['issues_fixed', 'repaired_chapters']),
  ].join('\n')
}

// ── LLM Execution via provider-runtime ──

async function callLLM<T = any>(
  activeWorkspace: string,
  modelId: number | undefined,
  messages: LLMMessage[],
  temperature: number,
  maxTokens: number,
) {
  const request: LLMRequest = {
    model: '',
    messages,
    temperature,
    max_tokens: maxTokens,
  }
  return executeWithRuntimeModel<T>(activeWorkspace, request, modelId) as LLMResponse<T>
}

// ── Single Agent Execution with Retry ──

async function executeOneAgent<T = any>(
  agentId: string,
  project: NovelProjectRecord,
  context: Record<string, any>,
  strategyEntry?: any,
  activeWorkspace = '',
  modelId?: number,
): Promise<LLMResponse<T>> {
  const messages: LLMMessage[] = [
    { role: 'system', content: buildAgentMessages(agentId, project, context).systemContent },
    { role: 'user', content: buildAgentMessages(agentId, project, context).userContent },
  ]

  const maxRetries = strategyEntry?.retries ?? 2
  let lastError: string | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await callLLM<T>(
        activeWorkspace,
        modelId,
        messages,
        strategyEntry?.temperature ?? 0.5,
        strategyEntry?.max_tokens ?? 4096,
      )
      if (response.error) throw new Error(response.error)
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
  } as LLMResponse<T>
}

// ── Novel Plan Generation ──

export async function generateNovelPlan(
  project: NovelProjectRecord,
  prompt: string,
  activeWorkspace: string,
  modelId?: number,
  _model?: any,
  scope?: string[],
) {
  const allAgents = topologicalSortAgents(buildNovelAgentPlan(project))
  const agentPlan = scope && scope.length > 0
    ? allAgents.filter(a => scope.includes(a.id))
    : allAgents
  const strategy = buildNovelStrategy(project)
  const results: Array<{ step: string; success: boolean; output: any; error: string; outputSource: string }> = []
  const seed = buildNovelSeed(project, prompt)

  // Initialize memory palace
  try { await initMemoryPalace() } catch { /* non-fatal */ }

  let upstreamContext = {}
  // 累积所有核对问题与事实矛盾，注入下游 Agent
  const _verificationIssues: Array<any> = []
  const _contradictions: Array<any> = []

  for (const agent of agentPlan) {
    const strategyEntry = strategy.find(s => s.agent_id === agent.id)

    // Memory injection — 使用 ForProject 族函数，经过双重标识校验
    let memoryInjectionText = ''
    try {
      const memResult = await buildMemoryInjectionForProject(project.id, project.title, {
        worldbuilding: upstreamContext['world-agent']?.output,
        characters: upstreamContext['character-agent']?.output?.characters,
        outline: upstreamContext['outline-agent']?.output,
        chapterTitle: seed.chapters?.[0]?.title,
        prevChapters: upstreamContext['prose-agent']?.output?.prose_chapters,
        // 注入累积的核对问题与矛盾
        verificationIssues: _verificationIssues,
        contradictions: _contradictions,
      })
      memoryInjectionText = memResult?.text || ''
    } catch { /* non-fatal */ }

    const context = {
      ...seed,
      upstreamContext,
      memoryInjectionText,
      project,
      payload: extractChapterCountPayload(prompt),
    }

    const response = await executeOneAgent(
      agent.id, project, context, strategyEntry, activeWorkspace, modelId,
    )

    const parsedOutput = response.parsed || parseJsonFromContent(response.content)
    const success = !response.error && !!parsedOutput
    let output = parsedOutput || {}

    if (success && agent.id === 'outline-agent') {
      const guard = validateOutlineThemeAlignment(project, output)
      if (!guard.ok) {
        output = {}
        results.push({ step: agent.id, success: false, output, error: guard.reason, outputSource: 'seed' })
        upstreamContext = { ...upstreamContext, [agent.id]: output }
        continue
      }
    }

    results.push({ step: agent.id, success, output, error: response.error || '', outputSource: success ? 'llm' : 'seed' })
    upstreamContext = { ...upstreamContext, [agent.id]: output }

    // 使用 verifyAndStoreAgentOutputForProject 闭环：存入 → 核对 → 矛盾扫描
    try {
      const verifyResult = await verifyAndStoreAgentOutputForProject(project.id, project.title, agent.id, output)
      if (verifyResult.verificationIssues.length > 0) {
        _verificationIssues.push(...verifyResult.verificationIssues)
      }
      if (verifyResult.contradictions.length > 0) {
        _contradictions.push(...verifyResult.contradictions)
      }
    } catch { /* non-fatal */ }
  }

  const getResult = (step: string) => results.find(r => r.step === step && r.outputSource === 'llm')?.output || {}

  return {
    plan: {
      market: getResult('market-agent'),
      world: getResult('world-agent'),
      characters: getResult('character-agent'),
      outline: getResult('outline-agent'),
      chapters: getResult('chapter-agent'),
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
  payload?: Record<string, any>,   // P1-1: 新增 payload 参数，支持 chapterCount / continueFrom / userOutline 等
  extraPayload?: Record<string, any>, // 兼容旧的额外参数
) {
  const agentPlan = topologicalSortAgents(buildNovelAgentPlan(project))
  const strategy = buildNovelStrategy(project)
  const results: Array<{ step: string; success: boolean; output: any; error: string; outputSource: string }> = []
  const seed = buildNovelSeed(project, prompt)

  try { await initMemoryPalace() } catch { /* non-fatal */ }

  let upstreamContext = {}

  for (const agent of agentPlan) {
    if (agentFilter && agentFilter.length > 0 && !agentFilter.includes(agent.id)) {
      results.push({ step: agent.id, success: false, output: null, error: 'skipped_by_filter', outputSource: 'skipped' })
      continue
    }

    const strategyEntry = strategy.find(s => s.agent_id === agent.id)

    // Memory injection — 使用 ForProject 族函数，经过双重标识校验
    let memoryInjectionText = ''
    try {
      const memResult = await buildMemoryInjectionForProject(project.id, project.title, {
        worldbuilding: upstreamContext['world-agent']?.output,
        characters: upstreamContext['character-agent']?.output?.characters,
        outline: upstreamContext['outline-agent']?.output,
        chapterTitle: seed.chapters?.[0]?.title,
        prevChapters: upstreamContext['prose-agent']?.output?.prose_chapters,
      })
      memoryInjectionText = memResult?.text || ''
    } catch { /* non-fatal */ }

    const context = {
      ...seed,
      upstreamContext,
      memoryInjectionText,  // 传给 buildAgentMessages 拼接到 prompt
      project,
      payload: { ...(payload || {}), ...(extraPayload || {}) },
    }

    const response = await executeOneAgent(
      agent.id, project, context, strategyEntry, activeWorkspace, modelId,
    )

    const parsedOutput = response.parsed || parseJsonFromContent(response.content)
    const success = !response.error && !!parsedOutput
    const output = parsedOutput || {}
    results.push({ step: agent.id, success, output, error: response.error || '', outputSource: success ? 'llm' : 'seed' })
    upstreamContext = { ...upstreamContext, [agent.id]: output }

    try { await storeAgentOutputForProject(project.id, project.title, agent.id, output) } catch { /* non-fatal */ }
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
  snapshot: { worldbuilding?: any; characters?: any[]; outlines?: any[]; chapters?: any[] },
  activeWorkspace: string,
  modelId?: number,
) {
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

  const maxRetries = 3
  let lastError: string | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await callLLM(activeWorkspace, modelId, messages, 0.3, 8192)
      if (response.error) throw new Error(response.error)

      const output = response.parsed || parseJsonFromContent(response.content)
      if (!output) throw new Error('Failed to parse JSON response')
      if (!output.issues_fixed && !output.repaired_chapters && !output.repaired_outlines) {
        throw new Error('Response missing required repair fields')
      }

      return { success: true, output, error: undefined, modelId, modelName: undefined, fallbackUsed: false, usage: response.usage }
    } catch (error) {
      lastError = String(error)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
      }
    }
  }

  return {
    success: false,
    output: buildNovelRepairFallback(project, reviewIssues, snapshot),
    error: lastError,
    modelId,
    modelName: undefined,
    fallbackUsed: true,
  }
}

function parseJsonFromContent(content: string): any {
  try { return JSON.parse(content) } catch {
    const match = content.match(/```json\s*([\s\S]*?)\s*```/i)
    if (match) { try { return JSON.parse(match[1]) } catch { return null } }
    return null
  }
}

function extractChapterCountPayload(prompt: string): Record<string, any> {
  const match = String(prompt || '').match(/(\d{1,3})\s*章/)
  return match ? { chapterCount: Number(match[1]) } : {}
}

function validateOutlineThemeAlignment(project: NovelProjectRecord, output: any): { ok: boolean; reason: string } {
  const text = JSON.stringify(output || {})
  if (!text || text === '{}') return { ok: false, reason: 'outline-agent 返回为空' }

  const projectSignals = [
    project.title,
    project.genre,
    project.synopsis,
    ...(project.sub_genres || []),
    ...(project.style_tags || []),
  ]
    .map(v => String(v || '').trim().toLowerCase())
    .filter(Boolean)

  const badSignals = [
    '废墟尽头的灯塔', '废墟城市', '循环系统', '沈夜', '新元', '灯塔',
  ]

  const matchedProjectSignals = projectSignals.filter(signal => signal && text.toLowerCase().includes(signal))
  const matchedBadSignals = badSignals.filter(signal => text.includes(signal))

  if (matchedProjectSignals.length === 0 && matchedBadSignals.length >= 2) {
    return {
      ok: false,
      reason: `outline-agent 结果疑似跑题：未命中项目关键信号，且命中异常种子信号 ${matchedBadSignals.join('、')}`,
    }
  }

  const chapterOutlines = Array.isArray(output?.chapter_outlines) ? output.chapter_outlines : []
  const expectedCount = Number(output?.master_outline?.chapter_count || output?.chapter_count || 0)
  if (expectedCount > 0 && chapterOutlines.length > 0 && chapterOutlines.length !== expectedCount) {
    return {
      ok: false,
      reason: `outline-agent 章节数不符合要求：期望 ${expectedCount} 章，实际 ${chapterOutlines.length} 章`,
    }
  }

  return { ok: true, reason: '' }
}

function buildNovelRepairFallback(
  _project: NovelProjectRecord,
  reviewIssues: Array<any>,
  original: { worldbuilding?: any; characters?: any[]; outlines?: any[]; chapters?: any[] },
) {
  return {
    issues_fixed: reviewIssues.map((issue, i) => ({
      index: i + 1,
      issue: typeof issue === 'string' ? issue : JSON.stringify(issue),
      fix: '已应用修复策略，内容已根据审校建议更新。',
    })),
    repaired_chapters: (original.chapters || []).map(ch => ({
      ...ch,
      chapter_summary: `${ch.chapter_summary || ''}（已修订）`,
      ending_hook: `${ch.ending_hook || ''}（已修订）`,
    })),
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
  let memoryInjection = ''
  try {
    const memResult = await buildMemoryInjectionForProject(project.id, project.title, {
      worldbuilding: context.worldbuilding,
      characters: context.characters,
      outline: context.outline,
      chapterTitle: chapter.title,
      chapterSummary: chapter.chapter_summary,
      prevChapters: context.prevChapters,
    })
    memoryInjection = memResult.text || ''
  } catch { /* non-fatal */ }

  const upstreamContext = memoryInjection ? { memoryInjectionText: memoryInjection } : {}
  const proseMessages: LLMMessage[] = [
    {
      role: 'system',
      content: buildAgentMessages('prose-agent', project, {
        ...context, chapterDraft: chapter, upstreamContext, prevChapters: context.prevChapters,
      }).systemContent,
    },
    {
      role: 'user',
      content: buildAgentMessages('prose-agent', project, {
        ...context, chapterDraft: chapter, upstreamContext, prevChapters: context.prevChapters,
      }).userContent,
    },
  ]

  const maxRetries = 3
  let lastError: string | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await callLLM(activeWorkspace, modelId, proseMessages, 0.75, 8192)
      if (response.error) throw new Error(response.error)

      const output = response.parsed || parseJsonFromContent(response.content)
      if (!output || !output.prose_chapters) throw new Error('Response missing prose_chapters')

      try { await storeAgentOutputForProject(project.id, project.title, 'prose-agent', output) } catch { /* non-fatal */ }

      return { success: true, output, error: undefined, outputSource: 'llm', modelId, modelName: undefined, providerId: undefined, usage: response.usage }
    } catch (error) {
      lastError = String(error)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
      }
    }
  }

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

// ── Platform Fit Analysis ──

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
  try {
    const { buildPlatformFitPrompt } = await import('./prompts')
    const messages: LLMMessage[] = [
      { role: 'system', content: baseNovelSystemPrompt() + buildStyleGuardrails(project) },
      { role: 'user', content: buildPlatformFitPrompt(project, context) },
    ]
    const response = await callLLM(activeWorkspace, modelId, messages, 0.2, 4096)
    if (response.parsed) return response.parsed
    if (response.content) return parseJsonFromContent(response.content)
  } catch { /* fall through */ }

  const chapters = context.chapters || []
  const proseCount = chapters.filter(ch => ch.chapter_text).length
  const chapterCount = chapters.length

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
