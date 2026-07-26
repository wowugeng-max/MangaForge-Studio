import type { KnowledgeEntry, KnowledgeIngestJob } from './types'
import {
  extractKnowledgeRows,
  isProviderUploadFailure,
  normalizeKnowledgeEntry,
  nowIso,
  compactEntryForSynthesis,
  dedupeKnowledgeEntries,
} from './pure-helpers'

/**
 * Analyze text using LLM to extract writing knowledge.
 */
export async function analyzeKnowledge(text: string, source: string, modelId?: number, options?: {
  signal?: AbortSignal
  timeoutMs?: number
  maxRetries?: number
}): Promise<KnowledgeEntry[]> {
  const { buildNovelAnalysisPrompt } = await import('../llm/prompts')
  const { executeWithRuntimeModel } = await import('../llm/provider-runtime')
  const { loadActiveWorkspace } = await import('../workspace')

  const workspace = await loadActiveWorkspace()
  const preferredModelId = Number(modelId || 0) || undefined
  const limits = [12000, 8000, 5000, 3000]
  let lastError: unknown = null

  for (const limit of limits) {
    if (options?.signal?.aborted) throw new Error('Request canceled')
    const prompt = buildNovelAnalysisPrompt(source, text.slice(0, limit))
    try {
      const result = await executeWithRuntimeModel<any[]>(
        workspace,
        {
          model: 'balanced',
          messages: [
            { role: 'system', content: '你是一位资深的文学评论家和写作导师。你只输出合法 JSON 数组。' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: limit <= 5000 ? 3072 : 4096,
          response_format: 'json',
        },
        preferredModelId,
        {
          signal: options?.signal,
          timeoutMs: options?.timeoutMs,
          maxRetries: options?.maxRetries ?? 2,
        },
      )

      if (result.error) {
        throw new Error(result.error)
      }

      const parsed = extractKnowledgeRows(result)
      return parsed
        .filter(Boolean)
        .map((row: any) => normalizeKnowledgeEntry({
          category: row?.category,
          title: row?.title,
          content: row?.content,
          tags: row?.tags,
          genre_tags: row?.genre_tags,
          trope_tags: row?.trope_tags,
          use_case: row?.use_case,
          evidence: row?.evidence,
          chapter_range: row?.chapter_range,
          entities: row?.entities,
          confidence: row?.confidence,
          weight: row?.weight,
          source,
          source_title: source,
        }))
        .filter(entry => Boolean(entry.content))
    } catch (error) {
      lastError = error
      if (isProviderUploadFailure(error)) {
        throw new Error(`Provider upload failed：模型服务上传输入失败，请切换模型或检查当前模型代理。${String(error).slice(0, 300)}`)
      }
      if (limit === limits[limits.length - 1]) {
        throw error
      }
      console.warn(`[knowledge-ingest] Analyze failed for ${source}; retrying with smaller prompt (${limit} -> next): ${String(error).slice(0, 160)}`)
    }
  }

  throw new Error(String(lastError || 'AI 未提炼出可入库知识'))
}

export async function synthesizeFullBookKnowledge(
  job: KnowledgeIngestJob,
  entries: KnowledgeEntry[],
  chapters: any[],
  signal?: AbortSignal,
): Promise<KnowledgeEntry[]> {
  if (!entries.length) return []

  const { executeWithRuntimeModel } = await import('../llm/provider-runtime')
  const { loadActiveWorkspace } = await import('../workspace')
  const workspace = await loadActiveWorkspace()

  const firstChapter = chapters[0]?.chapter || job.start_chapter || 1
  const lastChapter = chapters[chapters.length - 1]?.chapter || chapters.length
  const chapterRange = `第${firstChapter}-${lastChapter}章`
  const chapterSamples = chapters.slice(0, 12).map(ch => ({
    chapter: ch.chapter,
    title: String(ch.title || '').slice(0, 80),
  }))
  const compactEntries = entries.slice(0, 120).map(compactEntryForSynthesis)

  const prompt = `你是一位资深网文拆书策划和小说知识库架构师。现在有一部小说的分批提炼结果，请你做“全书级合并、去重、画像总结”。

任务目标：
1. 合并重复或高度相似的知识点，保留更抽象、更可复用的写作规则。
2. 补齐全书画像：题材定位、核心卖点、套路模板、读者钩子、情绪设计、资源经济、长期冲突、能力/境界/世界观体系。
3. 额外抽象成可用于“参考仿写”的结构蓝图：全书结构、分卷节奏、章节模板、角色功能、爽点模型、资源经济、文风句法。
4. 每条知识必须可用于后续创作检索，不要只做剧情摘要。
5. 重要信息不要丢：如果多个批次都支持同一条规则，把证据和章节范围合并概括。

来源：${job.url}
章节范围：${chapterRange}
章节样本：${JSON.stringify(chapterSamples, null, 2)}
分批知识候选：
${JSON.stringify(compactEntries, null, 2).slice(0, 52000)}

请输出纯 JSON 数组，每个元素字段如下：
- category: 固定类别优先，可用 reference_profile/volume_architecture/chapter_beat_template/character_function_matrix/resource_economy_model/style_profile/character_design/story_design/story_pacing/foreshadowing/ability_design/realm_design/worldbuilding/writing_style/technique/volume_design/genre_positioning/trope_design/selling_point/reader_hook/emotion_design/scene_design/conflict_design/resource_economy/payoff_model/prose_syntax_profile/dialogue_mechanism
- title: 简短标题
- content: 200-500 字，写成可复用规则，包含具体例子
- tags: 普通标签数组
- genre_tags: 题材/子类型标签数组
- trope_tags: 套路/卖点标签数组
- use_case: 适用写作任务
- evidence: 支撑该规则的原文/情节证据概括，不超过 120 字
- chapter_range: 该知识主要依据的章节范围
- entities: 涉及角色、物品、能力、势力、地点数组
- confidence: 0-1
- weight: 1-5

数量要求：输出 22-52 条。必须覆盖 reference_profile、volume_architecture、chapter_beat_template、character_function_matrix、style_profile、genre_positioning、selling_point、reader_hook、emotion_design、conflict_design、payoff_model、prose_syntax_profile；如果文本涉及金钱、装备、修炼成本或资源流转，必须包含 resource_economy_model 和 resource_economy；如果对话承担笑点/信息差/人设塑造，必须包含 dialogue_mechanism。
profile 类条目必须写成“可迁移蓝图”，明确说明可借鉴结构、使用场景、避免照搬点，不要复述源作品专名。
不要返回 markdown，不要解释，只返回 JSON 数组。`

  const result = await executeWithRuntimeModel<any[]>(
    workspace,
    {
      model: 'balanced',
      messages: [
        { role: 'system', content: '你只输出合法 JSON 数组，不输出 markdown。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.25,
      max_tokens: 8192,
      response_format: 'json',
    },
    Number(job.model_id || 0) || undefined,
    {
      signal,
    },
  )

  if (result.error) throw new Error(result.error)
  const parsed = extractKnowledgeRows(result)

  const synthesized = parsed
    .filter(Boolean)
    .map((row: any) => normalizeKnowledgeEntry({
      category: row?.category,
      title: row?.title,
      content: row?.content,
      tags: row?.tags,
      genre_tags: row?.genre_tags,
      trope_tags: row?.trope_tags,
      use_case: row?.use_case,
      evidence: row?.evidence,
      chapter_range: row?.chapter_range || chapterRange,
      entities: row?.entities,
      confidence: row?.confidence,
      weight: row?.weight,
      source: `${job.url}（全书画像）`,
      source_title: `${job.url}（全书画像）`,
    }))
    .filter(entry => Boolean(entry.content))

  return synthesized.length ? dedupeKnowledgeEntries(synthesized) : entries
}

