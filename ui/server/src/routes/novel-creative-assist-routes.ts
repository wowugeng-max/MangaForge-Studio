import type { Express } from 'express'
import {
  createNovelReview,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelWorldbuilding,
} from '../novel'
import { executeNovelAgent as defaultExecuteNovelAgent } from '../llm'
import { compactText, parseJsonLikePayload } from './novel-route-utils'

export const CREATIVE_ASSIST_MODES = [
  'prose_review',
  'next_chapter',
  'outline_expand',
  'foreshadowing',
  'character_arc',
  'system_design',
  'research_cards',
] as const

export type CreativeAssistMode = typeof CREATIVE_ASSIST_MODES[number]

type CreativeAssistCard = {
  id: string
  type: string
  title: string
  intent: string
  reason: string
  suggestion: string
  risk: string
  applies_to: string
  action: string
}

type CreativeAssistResult = {
  mode: CreativeAssistMode
  summary: string
  context_status: string[]
  cards: CreativeAssistCard[]
  research_cards: any[]
  warnings: string[]
}

type CreativeAssistContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  listChapters?: (workspace: string, projectId: number) => Promise<any[]>
  listWorldbuilding?: (workspace: string, projectId: number) => Promise<any[]>
  listCharacters?: (workspace: string, projectId: number) => Promise<any[]>
  listOutlines?: (workspace: string, projectId: number) => Promise<any[]>
  listReviews?: (workspace: string, projectId: number) => Promise<any[]>
  createReview?: (workspace: string, data: any) => Promise<any>
  buildChapterContextPackage?: (
    workspace: string,
    project: any,
    chapter: any,
    chapters: any[],
    worldbuilding: any[],
    characters: any[],
    outlines: any[],
    reviews: any[],
  ) => Promise<any>
  executeNovelAgent?: typeof defaultExecuteNovelAgent
  fetchResearchText?: (query: string) => Promise<string>
}

export function isCreativeAssistMode(value: unknown): value is CreativeAssistMode {
  return CREATIVE_ASSIST_MODES.includes(String(value || '') as CreativeAssistMode)
}

function asArray(value: any) {
  return Array.isArray(value) ? value : []
}

function card(mode: CreativeAssistMode, index: number, patch: Partial<CreativeAssistCard>): CreativeAssistCard {
  return {
    id: `${mode}-fallback-${index}`,
    type: patch.type || 'idea',
    title: patch.title || '创作建议',
    intent: patch.intent || '帮助作者获得下一步选择',
    reason: patch.reason || '当前材料可继续扩展，但需要作者确认方向。',
    suggestion: patch.suggestion || '先保留正史边界，再扩展 2-3 个可选写法。',
    risk: patch.risk || '不要在未确认前写入正史。',
    applies_to: patch.applies_to || 'current_project',
    action: patch.action || 'copy',
  }
}

function chapterLabel(chapter: any) {
  if (!chapter) return '当前项目'
  return `第${chapter.chapter_no || '?'}章《${chapter.title || '未命名'}》`
}

function projectPromise(project: any) {
  return compactText(
    project?.reference_config?.writing_bible?.promise
      || project?.reference_config?.style_lock?.reader_promise
      || project?.synopsis
      || project?.title
      || '当前作品核心承诺',
    120,
  )
}

function buildContextStatus(args: {
  project: any
  chapter: any
  selectedText: string
  contextPackage: any
  reviews: any[]
}) {
  return [
    args.project ? 'project_ready' : '',
    args.chapter ? 'chapter_ready' : 'project_level',
    args.selectedText ? 'selected_text_ready' : '',
    args.project?.reference_config?.writing_bible ? 'writing_bible_ready' : 'writing_bible_missing',
    args.contextPackage ? 'chapter_context_ready' : '',
    args.reviews.some(item => item.review_type === 'prose_quality') ? 'quality_review_ready' : '',
    asArray(args.project?.reference_config?.references).length ? 'references_configured' : '',
  ].filter(Boolean)
}

function buildFallbackCards(mode: CreativeAssistMode, args: {
  project: any
  chapter: any
  chapters: any[]
  characters: any[]
  outlines: any[]
  reviews: any[]
  selectedText: string
  question: string
  researchQuery: string
  researchText: string
}): CreativeAssistCard[] {
  const label = chapterLabel(args.chapter)
  const promise = projectPromise(args.project)
  const endingHook = compactText(args.chapter?.ending_hook || args.chapter?.raw_payload?.ending_hook || '', 100)
  const protagonist = compactText(args.characters[0]?.name || '主角', 40)
  const firstOutline = compactText(args.outlines[0]?.summary || args.outlines[0]?.title || '后续路线', 100)
  const selected = compactText(args.selectedText || args.chapter?.chapter_text || '', 140)

  if (mode === 'prose_review') {
    return [
      card(mode, 1, {
        type: 'evaluation',
        title: `${label}正文读感拆解`,
        intent: '先判断当前正文最该保留和最该加强的部分',
        reason: selected ? `当前样本文字可见：${selected}` : '当前章节还没有足够正文，适合先做结构评析。',
        suggestion: '从开篇钩子、角色行动、信息增量、冲突升级、章末追读五项检查正文；每项只改一个最影响追读的问题。',
        risk: '不要为了提高节奏删掉已经成立的设定证据和人物选择代价。',
        applies_to: 'current_prose',
        action: 'turn_into_revision_task',
      }),
      card(mode, 2, {
        type: 'revision',
        title: '保留作者意图的改稿方向',
        intent: '给作者提供可选改法，而不是直接重写',
        reason: `作品承诺是「${promise}」，改稿应服务这个承诺。`,
        suggestion: '写三个版本方向：更紧张、更有爽点、更有悬疑；作者选定后再进入局部改稿。',
        risk: '不要让模型把章节事实改成另一条剧情线。',
        applies_to: 'current_chapter',
        action: 'copy',
      }),
    ]
  }

  if (mode === 'next_chapter') {
    return [
      card(mode, 1, {
        type: 'branch',
        title: '安全续写分支',
        intent: '承接上一章结尾，不破坏既有大纲',
        reason: endingHook ? `当前钩子是「${endingHook}」。` : '当前章末钩子不够明确，需要先锁定下一章问题。',
        suggestion: `${protagonist}先处理章末异常的直接后果，再发现更高层规则或敌对势力的边缘证据。`,
        risk: '不要在下一章过早解释最终真相。',
        applies_to: 'next_chapter',
        action: 'copy',
      }),
      card(mode, 2, {
        type: 'commercial_pull',
        title: '强追读分支',
        intent: '把下一章开篇变成必须继续看的问题',
        reason: `读者承诺需要持续兑现「${promise}」。`,
        suggestion: '下一章前 300 字先给出可见危机或收益诱惑，中段让主角做有代价选择，结尾留下更具体的问题。',
        risk: '强刺激不能绕开主角能动性。',
        applies_to: 'next_chapter_opening',
        action: 'copy',
      }),
      card(mode, 3, {
        type: 'innovation',
        title: '创新反差分支',
        intent: '避免常规续写变成套路推进',
        reason: '辅助链路应给作者提供新选择，而不只是补齐自动链路。',
        suggestion: '让下一章的危险来自一个被读者误以为安全的规则、物品或关系，让主角用非标准方式破局。',
        risk: '反差必须能被现有设定解释。',
        applies_to: 'next_chapter_turn',
        action: 'copy',
      }),
    ]
  }

  if (mode === 'outline_expand') {
    return [
      card(mode, 1, {
        type: 'outline',
        title: '未来五章推进骨架',
        intent: '给作者一组可选择的后续路线',
        reason: `当前长线材料锚点：${firstOutline}。`,
        suggestion: '按「问题扩大 -> 代价显形 -> 小回收 -> 关系转折 -> 新阶段入口」设计未来五章。',
        risk: '不要让未来路线只扩大设定而没有角色选择。',
        applies_to: 'future_outline',
        action: 'open_outline_editor',
      }),
    ]
  }

  if (mode === 'foreshadowing') {
    return [
      card(mode, 1, {
        type: 'foreshadowing',
        title: '双层伏笔方案',
        intent: '同时服务短期追读和长期回收',
        reason: endingHook ? `章末已有可转伏笔的线索：「${endingHook}」。` : '当前章节需要一个可追踪的未解问题。',
        suggestion: '设计一条 2-3 章回收的小伏笔和一条 20 章以上回收的大伏笔，并为每条写清禁提前揭示点。',
        risk: '伏笔不能只靠旁白说明，必须落在物品、选择、台词或场景异常上。',
        applies_to: 'foreshadowing_arc',
        action: 'open_story_assets',
      }),
    ]
  }

  if (mode === 'character_arc') {
    return [
      card(mode, 1, {
        type: 'character_arc',
        title: `${protagonist}的下一次选择`,
        intent: '让人物推动剧情，而不是被剧情推着走',
        reason: `当前作品承诺「${promise}」需要角色用行动兑现。`,
        suggestion: '给主角一个不能同时保全收益、关系和秘密的选择，并让配角立场因此发生细微变化。',
        risk: '不要只写心理活动，必须有可见行动和后果。',
        applies_to: 'character_arc',
        action: 'open_character_editor',
      }),
    ]
  }

  if (mode === 'system_design') {
    return [
      card(mode, 1, {
        type: 'system_rule',
        title: '能力/物品体系的代价闭环',
        intent: '把设定变成能制造剧情的规则',
        reason: '能力、物品和势力体系需要限制，才会持续产生冲突。',
        suggestion: '为核心能力或物品补三项：触发条件、使用代价、失败后果；再写一个能被读者看见的利用场景。',
        risk: '不要新增无上限能力，避免破坏后续危机。',
        applies_to: 'system_design',
        action: 'open_story_assets',
      }),
    ]
  }

  return [
    card(mode, 1, {
      type: 'research',
      title: args.researchQuery ? `资料卡：${compactText(args.researchQuery, 60)}` : '资料卡生成',
      intent: '把资料转成可用的创作参考',
      reason: args.researchText ? `已读取资料摘要：${compactText(args.researchText, 160)}` : '当前未取得外部正文，先基于项目题材生成资料需求。',
      suggestion: '提炼事实细节、可视化元素、职业/制度约束和可转化冲突；只学习抽象机制，不迁移具体桥段和专名。',
      risk: '联网资料不能直接变成照搬设定或原句。',
      applies_to: 'research_cards',
      action: 'copy',
    }),
  ]
}

function buildPrompt(mode: CreativeAssistMode, args: {
  project: any
  chapter: any
  chapters: any[]
  characters: any[]
  outlines: any[]
  reviews: any[]
  contextPackage: any
  selectedText: string
  question: string
  researchQuery: string
  researchText: string
}) {
  return [
    '你是长篇网文创作参谋，不是自动写作流水线。',
    '任务：给作者提供多种创作建议卡，帮助作者主动决策，不能默认改正文、改设定或推进正史。',
    `模式：${mode}`,
    args.question ? `作者问题：${args.question}` : '',
    args.selectedText ? `选中文本：${args.selectedText.slice(0, 2000)}` : '',
    args.researchQuery ? `资料请求：${args.researchQuery}` : '',
    args.researchText ? `资料正文摘要：${args.researchText.slice(0, 3000)}` : '',
    '',
    '项目材料：',
    JSON.stringify({
      project: {
        id: args.project?.id,
        title: args.project?.title,
        genre: args.project?.genre,
        synopsis: args.project?.synopsis,
        writing_bible: args.project?.reference_config?.writing_bible || null,
      },
      chapter: args.chapter ? {
        id: args.chapter.id,
        chapter_no: args.chapter.chapter_no,
        title: args.chapter.title,
        summary: args.chapter.chapter_summary,
        goal: args.chapter.chapter_goal,
        conflict: args.chapter.conflict,
        ending_hook: args.chapter.ending_hook,
        text_sample: String(args.chapter.chapter_text || '').slice(0, 3000),
      } : null,
      context_package: args.contextPackage || null,
      characters: args.characters.slice(0, 20),
      outlines: args.outlines.slice(0, 40),
      recent_reviews: args.reviews.slice(0, 12).map(review => ({
        type: review.review_type,
        status: review.status,
        summary: review.summary,
        issues: review.issues,
      })),
    }, null, 2).slice(0, 16000),
    '',
    '只返回 JSON：{"summary":"一句话","cards":[{"type":"evaluation|revision|branch|outline|foreshadowing|character_arc|system_rule|research","title":"短标题","intent":"目的","reason":"为什么","suggestion":"具体建议","risk":"风险","applies_to":"作用范围","action":"copy|turn_into_revision_task|open_outline_editor|open_story_assets|open_character_editor"}],"research_cards":[],"warnings":[]}',
  ].filter(Boolean).join('\n')
}

function normalizeLlmAssist(mode: CreativeAssistMode, payload: any): Partial<CreativeAssistResult> | null {
  const parsed = payload?.assist || payload?.creative_assist || payload?.result || payload
  if (!parsed || typeof parsed !== 'object') return null
  const cards = asArray(parsed.cards).map((item: any, index: number) => card(mode, index + 1, {
    id: item.id,
    type: item.type,
    title: item.title,
    intent: item.intent,
    reason: item.reason,
    suggestion: item.suggestion,
    risk: item.risk,
    applies_to: item.applies_to || item.appliesTo,
    action: item.action,
  }))
  if (!cards.length) return null
  return {
    summary: String(parsed.summary || cards[0].title || '已生成创作建议'),
    cards,
    research_cards: asArray(parsed.research_cards || parsed.researchCards),
    warnings: asArray(parsed.warnings).map(String),
  }
}

async function defaultFetchResearchText(query: string) {
  const trimmed = String(query || '').trim()
  if (!/^https?:\/\//i.test(trimmed)) return ''
  const response = await fetch(trimmed)
  if (!response.ok) throw new Error(`research fetch failed: ${response.status}`)
  return compactText(await response.text(), 6000)
}

export function registerNovelCreativeAssistRoutes(app: Express, ctx: CreativeAssistContext) {
  app.post('/api/novel/projects/:id/creative-assist', async (req, res) => {
    try {
      const mode = String(req.body?.mode || 'prose_review')
      if (!isCreativeAssistMode(mode)) {
        return res.status(400).json({ error: `unsupported creative assist mode: ${mode}` })
      }

      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id || 0))
      if (!project) return res.status(404).json({ error: 'project not found' })

      const [
        chapters,
        worldbuilding,
        characters,
        outlines,
        reviews,
      ] = await Promise.all([
        (ctx.listChapters || listNovelChapters)(activeWorkspace, project.id),
        (ctx.listWorldbuilding || listNovelWorldbuilding)(activeWorkspace, project.id),
        (ctx.listCharacters || listNovelCharacters)(activeWorkspace, project.id),
        (ctx.listOutlines || listNovelOutlines)(activeWorkspace, project.id),
        (ctx.listReviews || listNovelReviews)(activeWorkspace, project.id),
      ])

      const chapterId = Number(req.body?.chapter_id || req.body?.chapterId || 0)
      const chapter = chapterId ? chapters.find(item => Number(item.id) === chapterId) || null : null
      const selectedText = String(req.body?.selected_text || req.body?.selectedText || '')
      const question = String(req.body?.question || '')
      const researchQuery = String(req.body?.research_query || req.body?.researchQuery || '')
      const warnings: string[] = []

      let contextPackage: any = null
      if (chapter && ctx.buildChapterContextPackage) {
        try {
          contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
        } catch (error) {
          warnings.push(`上下文包加载失败：${String(error).slice(0, 160)}`)
        }
      }

      let researchText = ''
      if (mode === 'research_cards' && researchQuery) {
        try {
          researchText = await (ctx.fetchResearchText || defaultFetchResearchText)(researchQuery)
        } catch (error: any) {
          warnings.push(error?.message || String(error))
        }
      }

      const fallbackCards = buildFallbackCards(mode, {
        project,
        chapter,
        chapters,
        characters,
        outlines,
        reviews,
        selectedText,
        question,
        researchQuery,
        researchText,
      })

      let llmAssist: Partial<CreativeAssistResult> | null = null
      const executeNovelAgent = ctx.executeNovelAgent || defaultExecuteNovelAgent
      if (executeNovelAgent && Number(req.body?.model_id || req.body?.modelId || 0)) {
        try {
          const result: any = await executeNovelAgent('review-agent', project, {
            task: buildPrompt(mode, {
              project,
              chapter,
              chapters,
              characters,
              outlines,
              reviews,
              contextPackage,
              selectedText,
              question,
              researchQuery,
              researchText,
            }),
          }, {
            activeWorkspace,
            modelId: String(req.body.model_id || req.body.modelId),
            maxTokens: 5000,
            temperature: 0.45,
          } as any)
          llmAssist = normalizeLlmAssist(mode, parseJsonLikePayload(result?.content) || result?.payload || result)
        } catch (error) {
          warnings.push(`模型参谋生成失败，已使用本地建议：${String(error).slice(0, 160)}`)
        }
      }

      const cards = (llmAssist?.cards?.length ? llmAssist.cards : fallbackCards).map((item, index) => ({
        ...item,
        id: item.id || `${mode}-card-${index + 1}`,
      }))
      const contextStatus = buildContextStatus({
        project,
        chapter,
        selectedText,
        contextPackage,
        reviews,
      })
      const assist: CreativeAssistResult = {
        mode,
        summary: String(llmAssist?.summary || `${chapterLabel(chapter)}已生成${cards.length}条创作参谋建议。`),
        context_status: contextStatus,
        cards,
        research_cards: llmAssist?.research_cards || [],
        warnings: [...warnings, ...asArray(llmAssist?.warnings).map(String)],
      }

      let review: any = null
      if (req.body?.save !== false) {
        review = await (ctx.createReview || createNovelReview)(activeWorkspace, {
          project_id: project.id,
          review_type: 'creative_assist',
          status: assist.warnings.length ? 'warn' : 'ok',
          summary: assist.summary,
          issues: assist.cards
            .slice(0, 6)
            .map(item => item.risk || item.reason || item.title)
            .filter(Boolean),
          payload: JSON.stringify({
            request: {
              mode,
              chapter_id: chapter?.id || null,
              selected_text_length: selectedText.length,
              question,
              research_query: researchQuery,
            },
            assist,
          }),
        })
      }

      res.json({ ok: true, assist, review })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}
