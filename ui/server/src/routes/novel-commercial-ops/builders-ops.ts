import { createHash } from 'crypto'
import {
  appendNovelRun,
  createNovelChapter,
  createNovelCharacter,
  createNovelOutline,
  createNovelProject,
  createNovelReview,
  createNovelWorldbuilding,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelRuns,
  listNovelSettingEntities,
  listNovelWorldbuilding,
  updateNovelOutline,
  updateNovelProject,
} from '../../novel'
import { readKeys } from '../../key-store'
import { readModels } from '../../model-store'
import { readProviders } from '../../provider-store'
import { executeNovelAgent } from '../../llm'
import { asArray, compactText, parseJsonLikePayload, safeJsonStringify } from '../novel-route-utils'


export function modelUsageRecommendation(model: any) {
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

export function interpretCreativeCommand(command: string, project: any) {
  const text = String(command || '').trim()
  const lower = text.toLowerCase()
  const actions: any[] = []
  const add = (key: string, label: string, endpoint: string, method = 'GET', executable = false, reason = '') => {
    if (!actions.some(item => item.key === key)) actions.push({ key, label, endpoint, method, executable, reason })
  }
  if (/机械|错字|重复|水文|ai味|质检|规则/.test(text)) {
    add('mechanical_qa', '运行机械质检', `/api/novel/projects/${project.id}/mechanical-qa/run`, 'POST', true, '检查重复、超长段落、禁用词、章末钩子和基础可读性。')
  }
  if (/前\s*30|前三十|留存|追读|开篇|试读|付费前/.test(text)) {
    add('first30_retention', '运行前30章留存诊断', `/api/novel/projects/${project.id}/first30-retention-diagnosis`, 'POST', true, '检查开篇三章、试读十章和付费前蓄势的追读风险。')
  }
  if (/(前\s*30|前三十|留存|追读|开篇|试读|付费前).*(修复|任务|队列)|(?:修复|任务|队列).*(前\s*30|前三十|留存|追读|开篇|试读|付费前)/.test(text)) {
    add('first30_repair', '生成前30章留存修复任务', `/api/novel/projects/${project.id}/first30-retention-diagnosis/repair-queue`, 'POST', true, '把前30章留存风险转成任务中心可处理的修复队列。')
  }
  if (/(长线|长篇|三百万|300\s*万).*(风险|治理|闭环|摘要|复查|还有)|(?:风险|治理|闭环|摘要|复查|还有).*(长线|长篇|三百万|300\s*万)/.test(text)) {
    add('longform_governance_summary', '查看长线治理闭环摘要', `/api/novel/projects/${project.id}/longform-governance-summary`, 'GET', true, '汇总最近一轮长线生产修复、复查状态、闭环审计和剩余风险。')
  }
  if (/300\s*万|三百万|长篇|长线|百万字|压力测试|塌线|扩容/.test(text)) {
    add('longform_pressure', '运行300万字长线压力测试', `/api/novel/projects/${project.id}/longform-pressure-test`, 'POST', true, '评估分卷容量、人物池、世界资产、冲突阶梯和回报循环是否能支撑长篇。')
  }
  if (/创作契约|核心不偏|故事强度|创新|读者吸引|一万均订|1\s*万均订|千万字|1000\s*万/.test(text)) {
    add('longform_creation_diagnosis', '运行长篇创作健康诊断', `/api/novel/projects/${project.id}/longform-creation-diagnosis`, 'POST', true, '按起点1万均订基础线检查核心不偏、故事强度、创新差异和读者吸引。')
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

export function normalizeBackupPayload(body: any) {
  const raw = body?.package || body?.backup || body
  if (typeof raw === 'string') return JSON.parse(raw)
  return raw || {}
}

export function buildLongformGovernanceBrief(project: any, runs: any[], reviews: any[]) {
  const repairRuns = runs
    .filter(run => run.run_type === 'longform_production_repair')
    .map(run => ({ run, payload: parseJsonLikePayload(run.output_ref) || {} }))
    .sort((a, b) => String(b.run.created_at || '').localeCompare(String(a.run.created_at || '')))
  const auditReviews = reviews
    .filter(review => review.review_type === 'longform_production_repair_audit')
    .map(review => ({ review, payload: parseJsonLikePayload(review.payload) || {} }))
    .sort((a, b) => String(b.review.created_at || '').localeCompare(String(a.review.created_at || '')))
  const latestRun = repairRuns[0] || null
  const latestAudit = latestRun?.payload?.audit_summary || auditReviews[0]?.payload?.audit || null
  const tasks = asArray(latestRun?.payload?.tasks)
  const needsReview = tasks.filter((task: any) => task.task_status === 'needs_review')
  const unresolved = tasks.filter((task: any) => task.task_status !== 'resolved')
  return {
    project_id: project.id,
    created_at: new Date().toISOString(),
    latest_repair_run: latestRun ? {
      id: latestRun.run.id,
      status: latestRun.run.status,
      created_at: latestRun.run.created_at,
      task_count: tasks.length,
      resolved_count: tasks.filter((task: any) => task.task_status === 'resolved').length,
      needs_review_count: needsReview.length,
      unresolved_count: unresolved.length,
    } : null,
    latest_audit: latestAudit,
    summary: latestAudit?.conclusion?.join(' ') || (latestRun ? `最近一轮长线修复任务 ${tasks.length} 项，未关闭 ${unresolved.length} 项。` : '暂无长线生产修复闭环记录。'),
    risks: [
      !latestRun ? '还没有长线生产修复队列。' : '',
      needsReview.length ? `${needsReview.length} 项任务等待复查确认。` : '',
      unresolved.length && !needsReview.length ? `${unresolved.length} 项任务未关闭。` : '',
      latestAudit?.remaining_risks?.current_recommendations?.[0] || '',
    ].filter(Boolean),
    next_actions: [
      !latestRun ? '先打开长线生产趋势报表并生成修复任务。' : '',
      needsReview.length ? '在任务中心复查清单里批量确认通过或逐项处理。' : '',
      latestRun && !latestAudit ? '生成闭环审计摘要，记录本轮治理效果。' : '',
    ].filter(Boolean),
  }
}

export async function importBackupAsNewProject(activeWorkspace: string, backup: any, options: any = {}) {
  if (backup.package_type !== 'novel_project_backup' || !backup.project) {
    throw new Error('不是有效的小说项目备份包。')
  }
  const sourceProject = backup.project || {}
  const titleSuffix = options.keep_title ? '' : '（导入）'
  const sanitizedReferenceConfig = { ...(sourceProject.reference_config || {}) }
  delete sanitizedReferenceConfig.prose_generation_source
  delete sanitizedReferenceConfig.chapter_generation_source
  const project = await createNovelProject(activeWorkspace, {
    ...sourceProject,
    id: undefined,
    title: String(options.title || `${sourceProject.title || '未命名项目'}${titleSuffix}`),
    reference_config: {
      ...sanitizedReferenceConfig,
      imported_from_backup: {
        source_project_id: sourceProject.id,
        source_title: sourceProject.title || '',
        exported_at: backup.exported_at || '',
        imported_at: new Date().toISOString(),
      },
    },
  })
  const outlineIdMap = new Map<number, number>()
  for (const outline of asArray(backup.outlines)) {
    const created = await createNovelOutline(activeWorkspace, { ...outline, id: undefined, project_id: project.id, parent_id: null })
    outlineIdMap.set(Number(outline.id || 0), created.id)
  }
  for (const outline of asArray(backup.outlines)) {
    const oldParentId = Number(outline.parent_id || 0)
    const newId = outlineIdMap.get(Number(outline.id || 0))
    const newParentId = oldParentId ? outlineIdMap.get(oldParentId) : null
    if (newId && newParentId) {
      await updateNovelOutline(activeWorkspace, newId, { parent_id: newParentId } as any)
    }
  }
  for (const item of asArray(backup.worldbuilding)) {
    await createNovelWorldbuilding(activeWorkspace, { ...item, id: undefined, project_id: project.id })
  }
  for (const character of asArray(backup.characters)) {
    await createNovelCharacter(activeWorkspace, { ...character, id: undefined, project_id: project.id })
  }
  for (const chapter of asArray(backup.chapters)) {
    await createNovelChapter(activeWorkspace, {
      ...chapter,
      id: undefined,
      project_id: project.id,
      outline_id: chapter.outline_id ? (outlineIdMap.get(Number(chapter.outline_id)) || null) : null,
    })
  }
  const manifest = {
    imported_project_id: project.id,
    title: project.title,
    imported_at: new Date().toISOString(),
    counts: {
      chapters: asArray(backup.chapters).length,
      outlines: asArray(backup.outlines).length,
      characters: asArray(backup.characters).length,
      worldbuilding: asArray(backup.worldbuilding).length,
    },
    source: {
      project_id: sourceProject.id,
      title: sourceProject.title || '',
      exported_at: backup.exported_at || '',
    },
  }
  await appendNovelRun(activeWorkspace, {
    project_id: project.id,
    run_type: 'project_backup_import',
    step_name: `import-${manifest.source.project_id || 'backup'}`,
    status: 'success',
    output_ref: JSON.stringify({ manifest }),
  })
  return { project, manifest }
}
