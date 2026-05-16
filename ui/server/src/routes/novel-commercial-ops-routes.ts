import type { Express } from 'express'
import { createHash } from 'crypto'
import {
  appendNovelRun,
  createNovelReview,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelRuns,
  listNovelWorldbuilding,
  updateNovelProject,
} from '../novel'
import { readKeys } from '../key-store'
import { readModels } from '../model-store'
import { readProviders } from '../provider-store'
import { asArray, compactText, parseJsonLikePayload } from './novel-route-utils'

type CommercialOpsContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
}

const genreTemplates = [
  {
    id: 'xianxia_upgrade',
    name: '仙侠升级流',
    genre: '仙侠',
    promise: '主角用清晰代价换取持续升级，每卷都有境界突破、身份跃迁和关系反转。',
    style_lock: {
      narrative_person: '第三人称有限视角',
      sentence_length: '中短句为主，关键战斗加速',
      dialogue_ratio: '30%-40%',
      payoff_density: '每章至少一个小爽点，每3-5章一个大爽点',
      description_density: '设定描写服务冲突，不连续堆设定',
    },
    structure: {
      volume_goal: '每卷围绕一个修炼阶段和一个外部压力闭环。',
      chapter_beat: ['开局压力', '策略选择', '代价执行', '反转收益', '章末新钩子'],
      forbidden: ['连续解释境界体系', '无代价突破', '反派只降智送资源'],
    },
  },
  {
    id: 'urban_comedy_growth',
    name: '都市轻喜成长',
    genre: '都市',
    promise: '现实压力、职场/校园关系和轻喜吐槽推动主角成长，爽点来自聪明解决具体难题。',
    style_lock: {
      narrative_person: '第三人称或第一人称均可',
      sentence_length: '短句和对话偏多',
      dialogue_ratio: '40%-55%',
      payoff_density: '每章一个现实问题解决或关系推进',
      description_density: '少量环境细节，重点写行动和反应',
    },
    structure: {
      volume_goal: '阶段性解决身份、金钱、关系或事业瓶颈。',
      chapter_beat: ['现实麻烦', '误会/压力升级', '主角奇招', '现场反馈', '新问题冒头'],
      forbidden: ['纯段子无剧情推进', '工具人只负责捧哏', '金手指无边界'],
    },
  },
  {
    id: 'infinite_horror',
    name: '无限流副本',
    genre: '无限流',
    promise: '每个副本都有规则、误导、死亡压力和破局推理，主角能力必须被规则约束。',
    style_lock: {
      narrative_person: '第三人称近距离',
      sentence_length: '悬疑段落短句，对抗段落加速',
      dialogue_ratio: '25%-40%',
      payoff_density: '每章至少一个规则发现或危险化解',
      description_density: '氛围描写点到即止，优先服务线索',
    },
    structure: {
      volume_goal: '副本从规则暴露、试错、牺牲、真相、破局逐步升级。',
      chapter_beat: ['异常现象', '规则线索', '错误代价', '临时破局', '更大威胁'],
      forbidden: ['无规则硬吓', '靠蛮力跳过谜题', '照搬经典恐怖桥段'],
    },
  },
]

function textHash(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 16)
}

function wc(text: string) {
  return String(text || '').replace(/\s/g, '').length
}

function splitParagraphs(text: string) {
  return String(text || '').split(/\n+/).map(item => item.trim()).filter(Boolean)
}

function topRepeatedPhrases(text: string) {
  const normalized = String(text || '').replace(/\s+/g, '')
  const counts = new Map<string, number>()
  for (let size = 4; size <= 8; size += 2) {
    for (let index = 0; index <= normalized.length - size; index += size) {
      const phrase = normalized.slice(index, index + size)
      if (/^[\u4e00-\u9fa5]{4,8}$/.test(phrase)) counts.set(phrase, (counts.get(phrase) || 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count >= 5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([phrase, count]) => ({ phrase, count }))
}

function buildMechanicalQa(project: any, chapters: any[]) {
  const bible = project.reference_config?.writing_bible || {}
  const banned = [
    ...asArray(bible.banned_words),
    ...asArray(project.reference_config?.style_lock?.banned_words),
    '不知为何',
    '很显然',
    '说时迟那时快',
  ].map(String).filter(Boolean)
  const rows = chapters
    .slice()
    .sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
    .map(chapter => {
      const text = String(chapter.chapter_text || '')
      const paragraphs = splitParagraphs(text)
      const wordCount = wc(text)
      const dialogueCount = (text.match(/[“"][^”"]+[”"]/g) || []).length
      const issues: any[] = []
      if (!text) issues.push({ severity: 'high', type: 'missing_text', message: '章节缺正文。' })
      if (text && wordCount < 1000) issues.push({ severity: 'medium', type: 'short_chapter', message: `章节字数偏短：${wordCount}` })
      if (text && wordCount > 6000) issues.push({ severity: 'low', type: 'long_chapter', message: `章节字数偏长：${wordCount}` })
      if (text && !chapter.ending_hook) issues.push({ severity: 'medium', type: 'missing_hook', message: '缺章末钩子。' })
      if (text && paragraphs.length < 8) issues.push({ severity: 'low', type: 'low_paragraph_count', message: '段落数量偏少，阅读节奏可能过密。' })
      const longParagraphs = paragraphs.map((item, index) => ({ index, chars: wc(item) })).filter(item => item.chars > 420)
      if (longParagraphs.length) issues.push({ severity: 'medium', type: 'long_paragraph', message: `存在 ${longParagraphs.length} 个超长段落。`, detail: longParagraphs.slice(0, 5) })
      const bannedHits = banned.filter(word => word && text.includes(word))
      if (bannedHits.length) issues.push({ severity: 'medium', type: 'banned_words', message: `命中禁用词/弱表达：${bannedHits.slice(0, 6).join('、')}` })
      const repeated = topRepeatedPhrases(text)
      if (repeated.length) issues.push({ severity: 'low', type: 'repeated_phrases', message: `高频重复短语：${repeated.slice(0, 4).map(item => `${item.phrase}(${item.count})`).join('、')}`, detail: repeated })
      const dialogueRatio = paragraphs.length ? Math.round((dialogueCount / paragraphs.length) * 100) : 0
      if (text && dialogueRatio < 8) issues.push({ severity: 'low', type: 'low_dialogue', message: '对话密度偏低，可能偏叙述说明。' })
      const penalty = issues.reduce((sum, issue) => sum + (issue.severity === 'high' ? 24 : issue.severity === 'medium' ? 10 : 4), 0)
      return {
        chapter_id: chapter.id,
        chapter_no: chapter.chapter_no,
        title: chapter.title,
        word_count: wordCount,
        paragraph_count: paragraphs.length,
        dialogue_count: dialogueCount,
        dialogue_ratio: dialogueRatio,
        score: Math.max(0, Math.min(100, 100 - penalty)),
        issues,
      }
    })
  const issues = rows.flatMap(row => row.issues.map((issue: any) => ({ ...issue, chapter_id: row.chapter_id, chapter_no: row.chapter_no, title: row.title })))
  const averageScore = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 0
  return {
    report_id: `mqa-${Date.now()}`,
    created_at: new Date().toISOString(),
    score: averageScore,
    status: issues.some(item => item.severity === 'high') ? 'blocked' : issues.some(item => item.severity === 'medium') ? 'warn' : 'ok',
    summary: {
      chapter_count: rows.length,
      issue_count: issues.length,
      high: issues.filter(item => item.severity === 'high').length,
      medium: issues.filter(item => item.severity === 'medium').length,
      low: issues.filter(item => item.severity === 'low').length,
    },
    rows,
    issues,
    next_actions: [
      issues.some(item => item.type === 'missing_text') ? '先补齐缺正文章节。' : '',
      issues.some(item => item.type === 'long_paragraph') ? '拆分超长段落，提升移动端阅读体验。' : '',
      issues.some(item => item.type === 'banned_words') ? '替换禁用词和弱表达。' : '',
      issues.some(item => item.type === 'repeated_phrases') ? '处理高频重复短语，降低机器感。' : '',
    ].filter(Boolean),
  }
}

function buildPropagationDebt(project: any, chapters: any[], characters: any[], outlines: any[], reviews: any[]) {
  const state = project.reference_config?.story_state || {}
  const debts: any[] = []
  const writtenMax = Math.max(0, ...chapters.filter(chapter => chapter.chapter_text).map(chapter => Number(chapter.chapter_no || 0)))
  if (writtenMax && Number(state.last_updated_chapter || 0) < writtenMax) {
    debts.push({
      id: `debt-story-state-${writtenMax}`,
      severity: 'high',
      source: 'story_state',
      title: '状态机落后于已写章节',
      message: `状态机停在第 ${state.last_updated_chapter || 0} 章，正文已写到第 ${writtenMax} 章。`,
      affected: { chapters: chapters.filter(ch => Number(ch.chapter_no || 0) > Number(state.last_updated_chapter || 0)).slice(0, 20).map(ch => ch.chapter_no) },
      next_action: '运行或人工校正故事状态机。',
    })
  }
  for (const character of characters) {
    if (character.status === 'active' && !character.current_state) {
      debts.push({
        id: `debt-character-state-${character.id}`,
        severity: 'medium',
        source: 'character',
        title: `角色缺当前状态：${character.name}`,
        message: '长篇生成前建议补齐角色位置、关系、目标和秘密暴露程度。',
        affected: { character_id: character.id, name: character.name },
        next_action: '在角色或故事状态机中补齐 current_state。',
      })
    }
  }
  const activeOutlines = outlines.filter(item => ['volume', 'arc', 'chapter'].includes(String(item.outline_type || '')))
  if (!activeOutlines.length) {
    debts.push({
      id: 'debt-outline-stage',
      severity: 'medium',
      source: 'outline',
      title: '缺分卷/阶段目标',
      message: '只有单章计划时，批量生成容易偏离长线推进。',
      affected: { outlines: outlines.length },
      next_action: '补分卷目标、阶段矛盾和关键转折。',
    })
  }
  const riskyReviews = reviews
    .filter(review => ['similarity_report', 'prose_quality', 'editor_report', 'mechanical_qa'].includes(review.review_type))
    .map(review => ({ review, payload: parseJsonLikePayload(review.payload) || {} }))
    .filter(item => item.review.status === 'warn' || item.review.status === 'blocked' || item.review.status === 'fail')
    .slice(0, 20)
  for (const item of riskyReviews) {
    debts.push({
      id: `debt-review-${item.review.id}`,
      severity: item.review.status === 'blocked' || item.review.status === 'fail' ? 'high' : 'medium',
      source: item.review.review_type,
      title: item.review.summary || item.review.review_type,
      message: asArray(item.review.issues).slice(0, 3).join('；') || compactText(item.review.payload || '', 160),
      affected: {
        chapter_id: item.payload.chapter_id || item.payload.report?.chapter_id || item.payload.quality_card?.chapter_id || null,
        chapter_no: item.payload.chapter_no || item.payload.report?.chapter_no || item.payload.quality_card?.chapter_no || null,
      },
      next_action: '打开对应章节或质量面板处理后标记解决。',
    })
  }
  const resolved = new Set(asArray(project.reference_config?.propagation_debt?.resolved).map((item: any) => String(item.id || item)))
  const active = debts.filter(item => !resolved.has(String(item.id)))
  return {
    debt_id: `debt-${Date.now()}`,
    created_at: new Date().toISOString(),
    score: Math.max(0, 100 - active.reduce((sum, item) => sum + (item.severity === 'high' ? 18 : item.severity === 'medium' ? 9 : 4), 0)),
    active_count: active.length,
    high_count: active.filter(item => item.severity === 'high').length,
    debts: active,
    resolved_count: resolved.size,
    next_actions: active.slice(0, 5).map(item => item.next_action),
  }
}

function modelUsageRecommendation(model: any) {
  const name = `${model.display_name || ''} ${model.model_name || ''}`.toLowerCase()
  const caps = model.capabilities || {}
  const longContext = Number(model.context_ui_params?.context_window || model.context_ui_params?.max_context || 0)
  return {
    draft: Boolean(caps.chat) && (name.includes('deepseek') || name.includes('gpt') || name.includes('claude') || name.includes('qwen')),
    review: Boolean(caps.chat),
    safety: Boolean(caps.chat),
    long_context: longContext >= 64000 || name.includes('long') || name.includes('128k'),
    risk: model.health_status !== 'healthy' ? '模型健康状态未知或异常，建议先做探针测试。' : '',
  }
}

function interpretCreativeCommand(command: string, project: any) {
  const text = String(command || '').trim()
  const lower = text.toLowerCase()
  const actions: any[] = []
  const add = (key: string, label: string, endpoint: string, method = 'GET', executable = false, reason = '') => {
    if (!actions.some(item => item.key === key)) actions.push({ key, label, endpoint, method, executable, reason })
  }
  if (/机械|错字|重复|水文|ai味|质检|规则/.test(text)) {
    add('mechanical_qa', '运行机械质检', `/api/novel/projects/${project.id}/mechanical-qa/run`, 'POST', true, '检查重复、超长段落、禁用词、章末钩子和基础可读性。')
  }
  if (/债务|影响|改动|传播|状态机|一致性/.test(text)) {
    add('propagation_debt', '刷新传播债务', `/api/novel/projects/${project.id}/propagation-debt/refresh`, 'POST', true, '检查状态机、角色状态、分卷目标和未处理审稿风险。')
  }
  if (/模型|服务商|provider|失败|空正文|上传|诊断/.test(lower)) {
    add('model_diagnostics', '查看模型诊断', `/api/novel/projects/${project.id}/model-diagnostics`, 'GET', true, '检查模型健康、Key、服务商和近期失败记录。')
  }
  if (/备份|快照|导出项目|项目包/.test(text)) {
    add('backup_snapshot', '创建项目备份快照', `/api/novel/projects/${project.id}/backup-snapshot`, 'POST', true, '创建项目级备份指纹，完整包可在交付区下载。')
  }
  if (/模板|类型|套路|玄幻|仙侠|都市|无限流|原创/.test(text)) {
    add('genre_templates', '打开类型模板方法库', '/api/novel/genre-templates', 'GET', true, '选择类型模板后写入写作圣经。')
  }
  if (/写|生成|续写|正文|章节/.test(text)) {
    add('generation_pipeline', '进入章节流水线', `/api/novel/chapters/{chapterId}/generation-pipeline/start`, 'POST', false, '生成类任务需要先确认当前章节、模型和材料完整度。')
  }
  if (/发布|交付|epub|docx|txt|markdown/.test(lower)) {
    add('export_delivery', '打开交付导出', `/api/novel/projects/${project.id}/export-preview`, 'GET', false, '正式导出前建议先跑质量基准和一致性检查。')
  }
  if (!actions.length) {
    add('production_check', '生产前检查', `/api/novel/projects/${project.id}/mechanical-qa/run`, 'POST', true, '未识别到明确动作，先执行低风险质量检查。')
    add('propagation_debt', '刷新传播债务', `/api/novel/projects/${project.id}/propagation-debt/refresh`, 'POST', true, '同步检查长篇状态风险。')
  }
  return {
    command: text,
    project_id: project.id,
    interpreted_at: new Date().toISOString(),
    confidence: actions.length === 1 ? 0.78 : 0.66,
    actions,
    warnings: actions.some(item => item.executable === false) ? ['生成、发布、覆盖类动作需要在对应工作台人工确认后执行。'] : [],
    next_ui: actions[0]?.key || 'production_check',
  }
}

export function registerNovelCommercialOpsRoutes(app: Express, ctx: CommercialOpsContext) {
  app.post('/api/novel/projects/:id/creative-command', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const plan = interpretCreativeCommand(String(req.body?.command || ''), project)
      const executable = req.body?.execute === true
      const executed: any[] = []
      if (executable) {
        for (const action of plan.actions.filter((item: any) => item.executable).slice(0, 3)) {
          if (action.key === 'mechanical_qa' || action.key === 'production_check') {
            const chapters = await listNovelChapters(activeWorkspace, project.id)
            const report = buildMechanicalQa(project, chapters)
            const review = await createNovelReview(activeWorkspace, {
              project_id: project.id,
              review_type: 'mechanical_qa',
              status: report.status === 'ok' ? 'ok' : 'warn',
              summary: `指令台机械质检：${report.score} 分，问题 ${report.summary.issue_count} 个`,
              issues: report.issues.slice(0, 30).map((item: any) => `第${item.chapter_no}章 ${item.message}`),
              payload: JSON.stringify({ command: plan.command, report }),
            })
            executed.push({ key: action.key, status: 'success', report, review_id: review.id })
          } else if (action.key === 'propagation_debt') {
            const [chapters, characters, outlines, reviews] = await Promise.all([
              listNovelChapters(activeWorkspace, project.id),
              listNovelCharacters(activeWorkspace, project.id),
              listNovelOutlines(activeWorkspace, project.id),
              listNovelReviews(activeWorkspace, project.id),
            ])
            const report = buildPropagationDebt(project, chapters, characters, outlines, reviews)
            await updateNovelProject(activeWorkspace, project.id, {
              reference_config: {
                ...(project.reference_config || {}),
                propagation_debt: {
                  ...(project.reference_config?.propagation_debt || {}),
                  latest_report: report,
                  updated_at: new Date().toISOString(),
                },
              },
            } as any)
            executed.push({ key: action.key, status: 'success', report })
          } else if (action.key === 'model_diagnostics') {
            executed.push({ key: action.key, status: 'ready', message: '模型诊断请在前端打开详情面板查看。' })
          } else if (action.key === 'backup_snapshot') {
            executed.push({ key: action.key, status: 'ready', message: '备份快照请使用交付区按钮创建，以便确认范围。' })
          } else if (action.key === 'genre_templates') {
            executed.push({ key: action.key, status: 'ready', templates: genreTemplates })
          }
        }
      }
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'creative_command',
        step_name: compactText(plan.command, 80) || 'creative-command',
        status: executed.some(item => item.status === 'success') ? 'success' : 'ready',
        input_ref: JSON.stringify({ command: plan.command, execute: executable }),
        output_ref: JSON.stringify({ plan, executed }),
      })
      res.json({ ok: true, plan, executed, run })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/mechanical-qa', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const chapters = await listNovelChapters(activeWorkspace, project.id)
      const report = buildMechanicalQa(project, chapters)
      res.json({ ok: true, report })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/mechanical-qa/run', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const chapters = await listNovelChapters(activeWorkspace, project.id)
      const report = buildMechanicalQa(project, chapters)
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'mechanical_qa',
        status: report.status === 'ok' ? 'ok' : 'warn',
        summary: `机械质检：${report.score} 分，问题 ${report.summary.issue_count} 个`,
        issues: report.issues.slice(0, 30).map((item: any) => `第${item.chapter_no}章 ${item.message}`),
        payload: JSON.stringify({ report }),
      })
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'mechanical_qa',
        step_name: 'mechanical-qa',
        status: report.status === 'ok' ? 'success' : 'warn',
        output_ref: JSON.stringify({ report, review_id: review.id }),
      })
      res.json({ ok: true, report, review, run })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/propagation-debt/refresh', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, characters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const report = buildPropagationDebt(project, chapters, characters, outlines, reviews)
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          propagation_debt: {
            ...(project.reference_config?.propagation_debt || {}),
            latest_report: report,
            updated_at: new Date().toISOString(),
          },
        },
      } as any)
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'propagation_debt',
        status: report.high_count ? 'warn' : 'ok',
        summary: `传播债务：活跃 ${report.active_count} 项，高风险 ${report.high_count} 项`,
        issues: report.debts.slice(0, 30).map((item: any) => `${item.title}：${item.message}`),
        payload: JSON.stringify({ report }),
      })
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'propagation_debt',
        step_name: 'refresh',
        status: report.high_count ? 'warn' : 'success',
        output_ref: JSON.stringify({ report, review_id: review.id }),
      })
      res.json({ ok: true, report, project: updated, review, run })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/propagation-debt/:debtId/resolve', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const old = project.reference_config?.propagation_debt || {}
      const resolved = [{ id: req.params.debtId, note: String(req.body?.note || ''), resolved_at: new Date().toISOString() }, ...asArray(old.resolved)].slice(0, 200)
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), propagation_debt: { ...old, resolved } },
      } as any)
      res.json({ ok: true, project: updated, resolved })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/model-diagnostics', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [models, providers, keys, runs] = await Promise.all([
        readModels(activeWorkspace),
        readProviders(activeWorkspace),
        readKeys(activeWorkspace),
        listNovelRuns(activeWorkspace, project.id),
      ])
      const rows = models.map((model: any) => {
        const provider = providers.find(item => item.id === model.provider)
        const key = keys.find(item => item.id === model.api_key_id)
        const recommendation = modelUsageRecommendation(model)
        return {
          id: model.id,
          display_name: model.display_name,
          model_name: model.model_name,
          provider: provider?.display_name || model.provider,
          provider_active: provider?.is_active !== false,
          key_ready: Boolean(key?.has_key || key?.key || key?.key_preview) && key?.is_active !== false,
          health_status: model.health_status || 'unknown',
          last_tested_at: model.last_tested_at || '',
          capabilities: model.capabilities || {},
          recommendation,
          score: [
            provider?.is_active !== false ? 20 : 0,
            key && key.is_active !== false ? 20 : 0,
            model.health_status === 'healthy' ? 25 : model.health_status === 'unknown' ? 10 : 0,
            recommendation.draft ? 15 : 0,
            recommendation.long_context ? 10 : 0,
            model.capabilities?.chat ? 10 : 0,
          ].reduce((sum, item) => sum + item, 0),
        }
      })
      const recentFailures = runs
        .filter(run => ['failed', 'warn'].includes(run.status) || String(run.error_message || run.output_ref || '').includes('Provider'))
        .slice(0, 12)
        .map(run => ({ id: run.id, run_type: run.run_type, step_name: run.step_name, status: run.status, error: compactText(run.error_message || run.output_ref || '', 220), created_at: run.created_at }))
      const report = {
        created_at: new Date().toISOString(),
        model_count: rows.length,
        healthy_count: rows.filter(row => row.health_status === 'healthy').length,
        ready_count: rows.filter(row => row.score >= 70).length,
        rows: rows.sort((a, b) => b.score - a.score),
        recent_failures: recentFailures,
        next_actions: [
          rows.some(row => !row.key_ready) ? '存在模型未绑定有效 Key。' : '',
          rows.some(row => row.health_status !== 'healthy') ? '建议在模型管理里运行健康探针。' : '',
          recentFailures.length ? '近期存在模型调用失败，批量生产前建议切换健康模型或降低并发。' : '',
        ].filter(Boolean),
      }
      res.json({ ok: true, report })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/genre-templates', (_req, res) => {
    res.json({ ok: true, templates: genreTemplates })
  })

  app.post('/api/novel/projects/:id/genre-templates/:templateId/apply', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const template = genreTemplates.find(item => item.id === req.params.templateId)
      if (!template) return res.status(404).json({ error: 'template not found' })
      const currentBible = project.reference_config?.writing_bible || {}
      const writingBible = {
        ...currentBible,
        promise: currentBible.promise || template.promise,
        style_lock: { ...(currentBible.style_lock || {}), ...template.style_lock },
        genre_method: template.structure,
        genre_template_id: template.id,
        updated_at: new Date().toISOString(),
      }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        genre: project.genre || template.genre,
        reference_config: {
          ...(project.reference_config || {}),
          writing_bible: writingBible,
        },
      } as any)
      await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'genre_template_apply',
        step_name: template.id,
        status: 'success',
        output_ref: JSON.stringify({ template, writing_bible: writingBible }),
      })
      res.json({ ok: true, template, writing_bible: writingBible, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/backup-package', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, characters, worldbuilding, reviews, runs] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelWorldbuilding(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
        listNovelRuns(activeWorkspace, project.id),
      ])
      const payload = {
        package_type: 'novel_project_backup',
        exported_at: new Date().toISOString(),
        project,
        chapters,
        outlines,
        characters,
        worldbuilding,
        reviews,
        runs,
      }
      const text = JSON.stringify(payload, null, 2)
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(project.title || `novel-${project.id}`)}-backup-${Date.now()}.json"`)
      res.send(text)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/backup-snapshot', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, characters, worldbuilding, reviews, runs] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelWorldbuilding(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
        listNovelRuns(activeWorkspace, project.id),
      ])
      const manifest = {
        snapshot_id: `backup-${project.id}-${Date.now()}`,
        created_at: new Date().toISOString(),
        project_id: project.id,
        title: project.title,
        counts: { chapters: chapters.length, outlines: outlines.length, characters: characters.length, worldbuilding: worldbuilding.length, reviews: reviews.length, runs: runs.length },
        text_hash: textHash(JSON.stringify({ project, chapters, outlines, characters, worldbuilding })),
      }
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'project_backup',
        status: 'ok',
        summary: `项目备份快照：${manifest.snapshot_id}`,
        issues: [],
        payload: JSON.stringify({ manifest }),
      })
      await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'project_backup',
        step_name: manifest.snapshot_id,
        status: 'success',
        output_ref: JSON.stringify({ manifest, review_id: review.id }),
      })
      res.json({ ok: true, manifest, review })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}
